import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../../auth/_utils'

type BackendResponse<T> = {
  success: boolean
  data?: T
  error?: { message?: string }
}

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL('/api/users/me', backend), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as BackendResponse<unknown> | null

  if (!response.ok || !payload?.success) {
    return NextResponse.json(
      {
        error:
          payload?.error && typeof payload.error.message === 'string'
            ? payload.error.message
            : 'Failed to update user',
      },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json({ success: true, user: payload.data })
}
