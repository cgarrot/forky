import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../../auth/_utils'

export const dynamic = 'force-dynamic'

type BackendResponse<T> = {
  success: boolean
  data?: T
  message?: string
  error?: { message?: string }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const { id } = await context.params

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL(`/api/projects/${encodeURIComponent(id)}`, backend), {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as BackendResponse<unknown> | null

  if (!response.ok || !payload?.success) {
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Project not found' },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json(payload.data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
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
  const response = await fetch(new URL(`/api/projects/${encodeURIComponent(id)}`, backend), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as BackendResponse<unknown> | null

  if (!response.ok || !payload?.success) {
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to update project' },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json(payload.data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const { id } = await context.params

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL(`/api/projects/${encodeURIComponent(id)}`, backend), {
    method: 'DELETE',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  })

  if (!response.ok && response.status !== 204) {
    const payload = (await response.json().catch(() => null)) as BackendResponse<unknown> | null
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to delete project' },
      { status: response.status || 500 }
    )
  }

  return new NextResponse(null, { status: 204 })
}
