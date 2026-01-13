import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../../../auth/_utils'

type BackendResponse<T> = {
  success: boolean
  data?: T
  error?: { message?: string }
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const { id } = await context.params

  const backend = getBackendApiBaseUrl()
  const url = new URL(`/api/projects/${encodeURIComponent(id)}/nodes`, backend)
  url.search = new URL(request.url).search

  const response = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as BackendResponse<unknown> | null

  if (!response.ok || !payload?.success) {
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to list nodes' },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json(payload.data ?? [], {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL(`/api/projects/${encodeURIComponent(id)}/nodes`, backend), {
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
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to create node' },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json(payload.data, { status: 201 })
}
