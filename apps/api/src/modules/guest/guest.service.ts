import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Prisma } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'
import { AuthService } from '../auth/auth.service'
import { ProjectsService } from '../projects/projects.service'
import { PrismaService } from '../../common/database/prisma.service'

type JwtPayload = {
  sub?: string
}

function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64)
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`
}

function extractBearerToken(authorization?: string): string | undefined {
  if (!authorization) return undefined
  if (!authorization.startsWith('Bearer ')) return undefined
  const [, token] = authorization.split(' ')
  return token
}

@Injectable()
export class GuestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly projectsService: ProjectsService,
    private readonly jwtService: JwtService
  ) {}

  async start() {
    const user = await this.createGuestUser()
    const tokens = await this.authService.issueTokensForUserId(user.id)

    const created = await this.projectsService.create(user.id, {
      name: 'Projet sans titre',
    })

    return {
      success: true,
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 15 * 60,
        projectId: created.data.id,
        shareToken: created.data.shareToken,
      },
      message: 'Mode invité démarré',
    }
  }

  async join(shareToken: string, authorization?: string) {
    const token = extractBearerToken(authorization)

    if (token) {
      const payload = await this.verifyJwt(token)
      const userId = payload.sub
      if (!userId) {
        throw new UnauthorizedException('Invalid token')
      }

      const project = await this.projectsService.getByShareToken(shareToken)
      await this.projectsService.addMemberIfMissing(project.id, userId)

      return {
        success: true,
        data: { projectId: project.id },
        message: 'Projet rejoint',
      }
    }

    const user = await this.createGuestUser()
    const project = await this.projectsService.getByShareToken(shareToken)
    await this.projectsService.addMemberIfMissing(project.id, user.id)

    const tokens = await this.authService.issueTokensForUserId(user.id)

    return {
      success: true,
      data: {
        projectId: project.id,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 15 * 60,
      },
      message: 'Projet rejoint',
    }
  }

  private async verifyJwt(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token)
      return payload
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }

  private async createGuestUser() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = randomBytes(8).toString('hex')
      const email = `guest_${suffix}@guest.local`
      const username = `guest_${suffix}`

      const password = randomBytes(32).toString('hex')
      const passwordHash = hashPassword(password)

      try {
        const created = await this.prisma.user.create({
          data: {
            email,
            username,
            passwordHash,
            isGuest: true,
          },
          select: { id: true, email: true, username: true },
        })

        return created
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue
        }
        throw error
      }
    }

    throw new ConflictException('Unable to create guest user')
  }
}
