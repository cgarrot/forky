import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthCookieOptions, getBackendApiBaseUrl } from '../../../auth/_utils'

type BackendGuestJoinResponse = {
  success: boolean
  data?: {
    projectId: string
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
}

type BackendRefreshResponse = {
  success: boolean
  data?: {
    access_token: string
    expires_in: number
  }
}

async function attemptJoin(params: { backend: string; shareToken: string; accessToken?: string }) {
  return fetch(
    new URL(`/api/guest/join/${encodeURIComponent(params.shareToken)}`, params.backend),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {}),
      },
      cache: 'no-store',
    }
  )
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const shareToken = requestUrl.searchParams.get('token')

  if (!shareToken) {
    return NextResponse.redirect(new URL('/login?error=missing_token', requestUrl.origin))
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  const refreshToken = cookieStore.get('refresh_token')?.value
  const backend = getBackendApiBaseUrl()

  let response = await attemptJoin({ backend, shareToken, accessToken })
  let payload = (await response.json().catch(() => null)) as BackendGuestJoinResponse | null

  if (response.status === 401 && refreshToken) {
    const refreshResponse = await fetch(new URL('/api/auth/refresh', backend), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    })

    const refreshPayload = (await refreshResponse.json().catch(() => null)) as BackendRefreshResponse | null

    if (refreshResponse.ok && refreshPayload?.success && refreshPayload.data) {
      response = await attemptJoin({
        backend,
        shareToken,
        accessToken: refreshPayload.data.access_token,
      })
      payload = (await response.json().catch(() => null)) as BackendGuestJoinResponse | null

      if (payload?.success && payload.data?.projectId) {
        const next = NextResponse.redirect(
          new URL(`/projects/${payload.data.projectId}`, requestUrl.origin)
        )
        next.cookies.set(
          'access_token',
          refreshPayload.data.access_token,
          getAuthCookieOptions({ maxAgeSeconds: refreshPayload.data.expires_in })
        )
        return next
      }
    }
  }

  if (!response.ok || !payload?.success || !payload.data?.projectId) {
    return NextResponse.redirect(
      new URL(`/s/${encodeURIComponent(shareToken)}?error=invalid_token`, requestUrl.origin)
    )
  }

  const next = NextResponse.redirect(
    new URL(`/projects/${payload.data.projectId}`, requestUrl.origin)
  )

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
