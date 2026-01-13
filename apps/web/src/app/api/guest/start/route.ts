import { NextResponse } from 'next/server'
import { getAuthCookieOptions, getBackendApiBaseUrl } from '../../auth/_utils'

type BackendGuestStartResponse = {
  success: boolean
  data?: {
    access_token: string
    refresh_token: string
    expires_in: number
    projectId: string
    shareToken: string | null
  }
}

export async function POST() {
  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL('/api/guest/start', backend), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  const payload = (await response.json().catch(() => null)) as BackendGuestStartResponse | null

  if (!response.ok || !payload?.success || !payload.data) {
    return NextResponse.json({ error: 'Guest start failed' }, { status: response.status || 500 })
  }

  const next = NextResponse.json({
    success: true,
    projectId: payload.data.projectId,
    shareToken: payload.data.shareToken,
  })

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
