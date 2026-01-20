import type { QuickAction } from '@forky/shared-core'
import { getProjectApi, updateProjectApi } from '@forky/state'

export async function getQuickActions(projectId: string): Promise<QuickAction[]> {
  const project = await getProjectApi(projectId)
  return project.quickActions ?? []
}

export async function setQuickActions(projectId: string, quickActions: QuickAction[]): Promise<void> {
  await updateProjectApi(projectId, { quickActions })
}
