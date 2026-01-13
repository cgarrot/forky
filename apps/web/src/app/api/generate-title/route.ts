import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../auth/_utils'

type BackendGenerateTitleResponse = {
  success: boolean
  data?: { title: string }
  error?: { message?: string }
}

type TitleRequest = {
  prompt?: string
  response?: string
}

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { prompt, response } = body as TitleRequest

  if (typeof prompt !== 'string' || typeof response !== 'string' || !prompt.trim() || !response.trim()) {
    return NextResponse.json({ error: 'Prompt and response are required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const backend = getBackendApiBaseUrl()
  const backendResponse = await fetch(new URL('/api/generate-title', backend), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ prompt, response }),
  })

  const payload = (await backendResponse.json().catch(() => null)) as BackendGenerateTitleResponse | null

  if (!backendResponse.ok || !payload?.success || !payload.data?.title) {
    return NextResponse.json(
      {
        error:
          payload?.error && typeof payload.error.message === 'string'
            ? payload.error.message
            : 'Failed to generate title',
      },
      { status: backendResponse.status || 500 }
    )
  }

  return NextResponse.json({ title: payload.data.title })
}
