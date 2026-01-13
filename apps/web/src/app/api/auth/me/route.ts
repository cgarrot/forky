import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../_utils'

type BackendMeResponse = {
  success: boolean
  data?: unknown
}

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const backend = getBackendApiBaseUrl()
  const response = await fetch(new URL('/api/users/me', backend), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as BackendMeResponse | null

  if (!response.ok || !payload?.success) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return NextResponse.json({ success: true, user: payload.data })
}
