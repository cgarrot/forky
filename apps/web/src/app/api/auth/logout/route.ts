import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthCookieOptions, getBackendApiBaseUrl } from '../_utils'

export async function POST() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const backend = getBackendApiBaseUrl()

  if (accessToken) {
    await fetch(new URL('/api/auth/logout', backend), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).catch(() => null)
  }

  const next = NextResponse.json({ success: true })

  next.cookies.set('access_token', '', getAuthCookieOptions({ maxAgeSeconds: 0 }))
  next.cookies.set('refresh_token', '', getAuthCookieOptions({ maxAgeSeconds: 0 }))

  return next
}
