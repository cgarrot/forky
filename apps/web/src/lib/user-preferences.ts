type MeResponse = {
  success?: boolean
  user?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export async function getLastProjectId(): Promise<string | null> {
  const response = await fetch('/api/auth/me', { cache: 'no-store' })
  const payload = (await response.json().catch(() => null)) as MeResponse | null

  if (!response.ok || !payload?.success || !isRecord(payload.user)) {
    return null
  }

  const prefs = payload.user.preferences
  if (!isRecord(prefs)) return null

  const last = prefs.lastProjectId
  return typeof last === 'string' && last.length > 0 ? last : null
}

export async function setLastProjectId(projectId: string): Promise<void> {
  if (!projectId) return

  await fetch('/api/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences: { lastProjectId: projectId } }),
  }).catch(() => null)
}
