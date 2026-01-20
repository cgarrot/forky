import type { Response } from 'express';
import type { CookieOptions } from 'express';

const isProd = process.env.NODE_ENV === 'production';
const cookieDomain = process.env.COOKIE_DOMAIN;

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
  ...(cookieDomain ? { domain: cookieDomain } : {}),
};

export function setAccessTokenCookie(
  res: Response,
  token: string,
  maxAgeSeconds: number,
) {
  res.cookie('access_token', token, {
    ...baseOptions,
    maxAge: maxAgeSeconds * 1000,
  });
}

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  maxAgeSeconds: number,
) {
  res.cookie('refresh_token', token, {
    ...baseOptions,
    maxAge: maxAgeSeconds * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.cookie('access_token', '', { ...baseOptions, maxAge: 0 });
  res.cookie('refresh_token', '', { ...baseOptions, maxAge: 0 });
}
