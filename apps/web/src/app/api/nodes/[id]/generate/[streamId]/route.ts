import { cookies } from 'next/headers'
import { getBackendApiBaseUrl } from '../../../../auth/_utils'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string; streamId: string }> }) {
  const { id, streamId } = await context.params

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const backend = getBackendApiBaseUrl()

  const response = await fetch(
    new URL(`/api/nodes/${encodeURIComponent(id)}/generate/${encodeURIComponent(streamId)}`, backend),
    {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        Accept: 'text/event-stream',
      },
      cache: 'no-store',
    }
  )

  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-cache')

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
