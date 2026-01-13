import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../../auth/_utils'

type BackendResponse<T> = {
  success: boolean
  data?: T
  error?: { message?: string }
}

export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const { id } = await context.params

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL(`/api/edges/${encodeURIComponent(id)}`, backend), {
    method: 'DELETE',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  })

  if (!response.ok && response.status !== 204) {
    const payload = (await response.json().catch(() => null)) as BackendResponse<unknown> | null
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to delete edge' },
      { status: response.status || 500 }
    )
  }

  return new NextResponse(null, { status: 204 })
}
