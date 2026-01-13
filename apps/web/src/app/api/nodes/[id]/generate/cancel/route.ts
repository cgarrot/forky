import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../../../../auth/_utils'

type BackendCancelResponse = {
  success: boolean
  data?: unknown
  error?: { message?: string }
}

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL(`/api/nodes/${encodeURIComponent(id)}/generate/cancel`, backend), {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as BackendCancelResponse | null
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to cancel generation' },
      { status: response.status || 500 }
    )
  }

  const payload = (await response.json().catch(() => null)) as BackendCancelResponse | null
  return NextResponse.json(payload?.data ?? { ok: true })
}
