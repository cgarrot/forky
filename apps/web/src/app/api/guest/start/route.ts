import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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

type BackendRefreshResponse = {
  success: boolean
  data?: {
    access_token: string
    expires_in: number
  }
}

async function requestGuestStart(backend: string, accessToken?: string) {
  return fetch(new URL('/api/guest/start', backend), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
}

export async function POST() {
  const backend = getBackendApiBaseUrl()
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  const refreshToken = cookieStore.get('refresh_token')?.value

  let response: Response

  if (accessToken) {
    response = await requestGuestStart(backend, accessToken)

    if (response.status === 401) {
      if (refreshToken) {
        const refreshResponse = await fetch(new URL('/api/auth/refresh', backend), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        const refreshPayload = (await refreshResponse.json().catch(() => null)) as BackendRefreshResponse | null

        if (refreshResponse.ok && refreshPayload?.success && refreshPayload.data?.access_token) {
          response = await requestGuestStart(backend, refreshPayload.data.access_token)
        } else {
          response = await requestGuestStart(backend)
        }
      } else {
        response = await requestGuestStart(backend)
      }
    }
  } else if (refreshToken) {
    const refreshResponse = await fetch(new URL('/api/auth/refresh', backend), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    const refreshPayload = (await refreshResponse.json().catch(() => null)) as BackendRefreshResponse | null

    if (refreshResponse.ok && refreshPayload?.success && refreshPayload.data?.access_token) {
      response = await requestGuestStart(backend, refreshPayload.data.access_token)
    } else {
      response = await requestGuestStart(backend)
    }
  } else {
    response = await requestGuestStart(backend)
  }

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
