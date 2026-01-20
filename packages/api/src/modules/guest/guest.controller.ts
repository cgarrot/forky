import { Controller, Headers, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from '../../common/utils/auth-cookies';
import { GuestService } from './guest.service';

function parseCookieHeader(value: string | undefined): Record<string, string> {
  if (!value) return {};
  const result: Record<string, string> = {};
  const parts = value.split(';');
  for (const part of parts) {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    if (!rawKey) continue;
    const rawValue = rawValueParts.join('=');
    if (!rawValue) continue;
    try {
      result[rawKey] = decodeURIComponent(rawValue);
    } catch {
      result[rawKey] = rawValue;
    }
  }
  return result;
}

function resolveAuthorization(params: {
  authorization?: string;
  cookie?: string;
}): string | undefined {
  if (params.authorization) return params.authorization;
  const cookies = parseCookieHeader(params.cookie);
  const token = cookies.access_token ?? cookies.accessToken;
  if (!token) return undefined;
  return `Bearer ${token}`;
}

@Controller('guest')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Post('start')
  async start(
    @Headers('authorization') authorization: string | undefined,
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authHeader = resolveAuthorization({ authorization, cookie });
    const payload = await this.guestService.start(authHeader);
    const data = payload?.data as
      | { access_token: string; refresh_token: string; expires_in: number }
      | { projectId: string }
      | undefined;
    const accessToken =
      data && 'access_token' in data ? data.access_token : undefined;
    const refreshToken =
      data && 'refresh_token' in data ? data.refresh_token : undefined;
    const expiresIn = data && 'expires_in' in data ? data.expires_in : 15 * 60;

    if (accessToken && refreshToken) {
      setAccessTokenCookie(res, accessToken, expiresIn);
      setRefreshTokenCookie(res, refreshToken, 7 * 24 * 60 * 60);
    }

    return payload;
  }

  @Post('join/:shareToken')
  async join(
    @Param('shareToken') shareToken: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authHeader = resolveAuthorization({ authorization, cookie });
    const payload = await this.guestService.join(shareToken, authHeader);
    const data = payload?.data as
      | { access_token: string; refresh_token: string; expires_in: number }
      | { projectId: string }
      | undefined;
    const accessToken =
      data && 'access_token' in data ? data.access_token : undefined;
    const refreshToken =
      data && 'refresh_token' in data ? data.refresh_token : undefined;
    const expiresIn = data && 'expires_in' in data ? data.expires_in : 15 * 60;

    if (accessToken && refreshToken) {
      setAccessTokenCookie(res, accessToken, expiresIn);
      setRefreshTokenCookie(res, refreshToken, 7 * 24 * 60 * 60);
    }

    return payload;
  }
}
