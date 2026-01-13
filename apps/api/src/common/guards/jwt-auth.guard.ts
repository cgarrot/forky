import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

type AuthTokenPayload = {
  sub: string
  email: string
  username?: string
  avatar?: string | null
}

type RequestWithUser = Request & { user?: AuthTokenPayload }

type CookieMap = Record<string, string>

function parseCookieHeader(value: string | undefined): CookieMap {
  if (!value) return {}

  const result: CookieMap = {}
  const parts = value.split(';')

  for (const part of parts) {
    const [rawKey, ...rawValueParts] = part.trim().split('=')
    if (!rawKey) continue

    const rawValue = rawValueParts.join('=')
    if (!rawValue) continue

    try {
      result[rawKey] = decodeURIComponent(rawValue)
    } catch {
      result[rawKey] = rawValue
    }
  }

  return result
}

function getAccessToken(request: RequestWithUser): string | null {
  const auth = request.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length)
  }

  const cookies = parseCookieHeader(request.headers.cookie)
  const token = cookies.accessToken ?? cookies.access_token
  return token ?? null
}

function isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
  if (typeof value !== 'object' || value === null) return false
  if (!('sub' in value) || !('email' in value)) return false
  return typeof (value as { sub: unknown }).sub === 'string' && typeof (value as { email: unknown }).email === 'string'
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()

    const token = getAccessToken(request)
    if (!token) {
      throw new UnauthorizedException('Missing access token')
    }

    const secret = this.configService.get<string>('JWT_SECRET')
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is not configured')
    }

    try {
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token, { secret })
      if (!isAuthTokenPayload(payload)) {
        throw new UnauthorizedException('Invalid token payload')
      }
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }
}
