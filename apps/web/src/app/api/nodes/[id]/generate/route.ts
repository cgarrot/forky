import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../../../auth/_utils'

type BackendGenerateResponse = {
  success: boolean
  data?: {
    nodeId: string
    streamId: string
  }
  error?: { message?: string }
}

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL(`/api/nodes/${encodeURIComponent(id)}/generate`, backend), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as BackendGenerateResponse | null

  if (!response.ok || !payload?.success || !payload.data?.streamId) {
    return NextResponse.json(
      { error: payload?.error && typeof payload.error.message === 'string' ? payload.error.message : 'Failed to start generation' },
      { status: response.status || 500 }
    )
  }

  return NextResponse.json({ streamId: payload.data.streamId })
}
