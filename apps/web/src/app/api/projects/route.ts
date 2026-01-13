import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../auth/_utils'

export const dynamic = 'force-dynamic'

type BackendResponse<T> = {
  success: boolean
  data?: T
  message?: string
  error?: { message?: string }
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const backend = getBackendApiBaseUrl()
  const url = new URL('/api/projects', backend)
  url.search = new URL(request.url).search

  const response = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as BackendResponse<unknown> | null

  if (!response.ok || !payload?.success) {
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to list projects' },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json(payload.data ?? [], {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const backend = getBackendApiBaseUrl()

  const response = await fetch(new URL('/api/projects', backend), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as BackendResponse<unknown> | null

  if (!response.ok || !payload?.success) {
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to create project' },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json(payload.data, {
    status: 201,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
