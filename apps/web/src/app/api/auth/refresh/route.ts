import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthCookieOptions, getBackendApiBaseUrl } from '../_utils'

type BackendRefreshResponse = {
  success: boolean
  data?: {
    access_token: string
    expires_in: number
  }
  error?: unknown
}

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'Missing refresh token' }, { status: 401 })
  }

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL('/api/auth/refresh', backend), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  const payload = (await response.json().catch(() => null)) as BackendRefreshResponse | null

  if (!response.ok || !payload?.success || !payload.data) {
    return NextResponse.json({ error: 'Refresh failed' }, { status: response.status || 500 })
  }

  const next = NextResponse.json({ success: true })

  next.cookies.set(
    'access_token',
    payload.data.access_token,
    getAuthCookieOptions({ maxAgeSeconds: payload.data.expires_in })
  )

  return next
}
