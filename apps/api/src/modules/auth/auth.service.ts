import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/database/prisma.service';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

type SafeUser = {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
};

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = scryptSync(password, salt, expected.length);

  return timingSafeEqual(expected, actual);
}

function toSafeUser(user: {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async resolveUsername(
    email: string,
    username: string | undefined,
  ): Promise<string> {
    const base = (username ?? email.split('@')[0] ?? 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '');

    const normalized = (
      base.length >= 3 ? base : `user${base}`.slice(0, 30)
    ).slice(0, 30);

    const candidates: string[] = [normalized];

    for (let i = 0; i < 5; i += 1) {
      const suffix = randomBytes(3).toString('hex');
      candidates.push(
        `${normalized.slice(0, Math.max(0, 30 - (suffix.length + 1)))}-${suffix}`,
      );
    }

    for (const candidate of candidates) {
      const existing = await this.prisma.user.findFirst({
        where: { username: candidate },
      });
      if (!existing) {
        return candidate;
      }
    }

    return `${normalized}-${randomBytes(8).toString('hex')}`.slice(0, 30);
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ tokens: Tokens; user: SafeUser }> {
    const username = await this.resolveUsername(dto.email, dto.username);

    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findFirst({ where: { email: dto.email } }),
      this.prisma.user.findFirst({ where: { username } }),
    ]);

    if (existingEmail) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'This email is already in use',
      });
    }

    if (existingUsername) {
      throw new ConflictException({
        code: 'USERNAME_ALREADY_EXISTS',
        message: 'This username is already in use',
      });
    }

    const passwordHash = hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.username,
      user.avatar,
    );

    return { tokens, user: toSafeUser(user) };
  }

  async login(dto: LoginDto): Promise<{ tokens: Tokens; user: SafeUser }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const valid = verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.username,
      user.avatar,
    );

    return { tokens, user: toSafeUser(user) };
  }

  async issueTokensForUserId(userId: string): Promise<Tokens> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    return this.issueTokens(user.id, user.email, user.username, user.avatar);
  }

  async refresh(refreshToken: string): Promise<Pick<Tokens, 'accessToken'>> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Token revoked',
      });
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    const accessToken = await this.signAccessToken(
      stored.userId,
      stored.user.email,
      stored.user.username,
      stored.user.avatar,
    );

    return { accessToken };
  }

  async logoutUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const valid = verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid current password');
    }

    const passwordHash = hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private async issueTokens(
    userId: string,
    email: string,
    username: string | null,
    avatar: string | null,
  ): Promise<Tokens> {
    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    const accessToken = await this.signAccessToken(
      userId,
      email,
      username,
      avatar,
    );

    return { accessToken, refreshToken };
  }

  private async signAccessToken(
    userId: string,
    email: string,
    username: string | null,
    avatar: string | null,
  ): Promise<string> {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is not configured');
    }

    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        username: username ?? undefined,
        avatar: avatar ?? undefined,
      },
      {
        secret,
        expiresIn: '15m',
      },
    );
  }
}
