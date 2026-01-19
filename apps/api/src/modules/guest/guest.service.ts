import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import { AuthService } from '../auth/auth.service';
import { ProjectsService } from '../projects/projects.service';
import { PrismaService } from '../../common/database/prisma.service';

type JwtPayload = {
  sub?: string;
};

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

function extractBearerToken(authorization?: string): string | undefined {
  if (!authorization) return undefined;
  if (!authorization.startsWith('Bearer ')) return undefined;
  const [, token] = authorization.split(' ');
  return token;
}

@Injectable()
export class GuestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly projectsService: ProjectsService,
    private readonly jwtService: JwtService,
  ) {}

  async start(authorization?: string) {
    const session = await this.getGuestSession(authorization);
    if (session) {
      const tokens = await this.authService.issueTokensForUserId(
        session.userId,
      );

      if (session.project) {
        return {
          success: true,
          data: {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expires_in: 15 * 60,
            projectId: session.project.id,
            shareToken: session.project.shareToken,
          },
          message: 'Guest mode started',
        };
      }

      const created = await this.projectsService.create(session.userId, {
        name: 'Untitled project',
      });

      return {
        success: true,
        data: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: 15 * 60,
          projectId: created.data.id,
          shareToken: created.data.shareToken,
        },
        message: 'Guest mode started',
      };
    }

    const user = await this.createGuestUser();
    const tokens = await this.authService.issueTokensForUserId(user.id);

    const created = await this.projectsService.create(user.id, {
      name: 'Untitled project',
    });

    return {
      success: true,
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 15 * 60,
        projectId: created.data.id,
        shareToken: created.data.shareToken,
      },
      message: 'Guest mode started',
    };
  }

  async join(shareToken: string, authorization?: string) {
    const token = extractBearerToken(authorization);

    if (token) {
      const payload = await this.verifyJwt(token);
      const userId = payload?.sub;
      if (!userId) {
        return this.joinAsGuest(shareToken);
      }

      const project = await this.projectsService.getByShareToken(shareToken);
      await this.projectsService.addMemberIfMissing(project.id, userId);

      return {
        success: true,
        data: { projectId: project.id },
        message: 'Project joined',
      };
    }

    return this.joinAsGuest(shareToken);
  }

  private async verifyJwt(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      return null;
    }
  }

  private async getGuestSession(authorization?: string) {
    const token = extractBearerToken(authorization);
    if (!token) return null;

    const payload = await this.verifyJwt(token);
    const userId = payload?.sub;
    if (!userId) return null;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, isGuest: true },
    });

    if (!user?.isGuest) return null;

    const project = await this.prisma.project.findFirst({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, shareToken: true },
    });

    return { userId, project: project ?? null };
  }

  private async joinAsGuest(shareToken: string) {
    const user = await this.createGuestUser();
    const project = await this.projectsService.getByShareToken(shareToken);
    await this.projectsService.addMemberIfMissing(project.id, user.id);

    const tokens = await this.authService.issueTokensForUserId(user.id);

    return {
      success: true,
      data: {
        projectId: project.id,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 15 * 60,
      },
      message: 'Project joined',
    };
  }

  private async createGuestUser() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = randomBytes(8).toString('hex');
      const email = `guest_${suffix}@guest.local`;
      const username = `guest_${suffix}`;

      const password = randomBytes(32).toString('hex');
      const passwordHash = hashPassword(password);

      try {
        const created = await this.prisma.user.create({
          data: {
            email,
            username,
            passwordHash,
            isGuest: true,
          },
          select: { id: true, email: true, username: true },
        });

        return created;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Unable to create guest user');
  }
}
