import { getAuthenticatedApiOrThrow, requestApi } from '../core/api/api'

type UserPreferences = {
  lastProjectId?: string | null
}

type UserApi = {
  preferences?: UserPreferences | null
}

export async function getLastProjectId(): Promise<string | null> {
  try {
    const api = getAuthenticatedApiOrThrow()
    const user = await requestApi<UserApi>(api.users.usersControllerGetMe())
    const last = user.preferences?.lastProjectId
    return typeof last === 'string' && last.length > 0 ? last : null
  } catch {
    return null
  }
}

export async function setLastProjectId(projectId: string): Promise<void> {
  if (!projectId) return

  const api = getAuthenticatedApiOrThrow()
  await requestApi<void>(
    api.users.usersControllerUpdateMe({
      preferences: { lastProjectId: projectId },
    })
  ).catch(() => null)
}
