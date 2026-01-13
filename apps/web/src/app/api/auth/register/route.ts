import { NextResponse } from 'next/server'
import { getAuthCookieOptions, getBackendApiBaseUrl } from '../_utils'

type BackendRegisterResponse = {
  success: boolean
  data?: {
    user: unknown
    access_token: string
    refresh_token: string
    expires_in: number
  }
  error?: unknown
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL('/api/auth/register', backend), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as BackendRegisterResponse | null

  if (!response.ok || !payload?.success || !payload.data) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: response.status || 500 }
    )
  }

  const next = NextResponse.json({ success: true, user: payload.data.user })

  next.cookies.set(
    'access_token',
    payload.data.access_token,
    getAuthCookieOptions({ maxAgeSeconds: payload.data.expires_in })
  )

  next.cookies.set(
    'refresh_token',
    payload.data.refresh_token,
    getAuthCookieOptions({ maxAgeSeconds: 7 * 24 * 60 * 60 })
  )

  return next
}
