export function getBackendApiBaseUrl(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
}

export function getAuthCookieOptions(params: { maxAgeSeconds: number }) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: params.maxAgeSeconds,
  }
}
