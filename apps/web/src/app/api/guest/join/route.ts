import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthCookieOptions, getBackendApiBaseUrl } from '../../auth/_utils'

type JoinRequest = {
  token: string
}

type BackendGuestJoinResponse = {
  success: boolean
  data?: {
    projectId: string
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { token } = body as JoinRequest

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const backend = getBackendApiBaseUrl()
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const response = await fetch(new URL(`/api/guest/join/${encodeURIComponent(token)}`, backend), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  const payload = (await response.json().catch(() => null)) as BackendGuestJoinResponse | null

  if (!response.ok || !payload?.success || !payload.data?.projectId) {
    return NextResponse.json({ error: 'Guest join failed' }, { status: response.status || 500 })
  }

  const next = NextResponse.json({ success: true, projectId: payload.data.projectId })

  if (payload.data.access_token && payload.data.refresh_token && payload.data.expires_in) {
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
  }

  return next
}
