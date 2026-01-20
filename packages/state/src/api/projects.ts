import type { QuickAction, Viewport } from '@forky/shared-core'
import { getAuthenticatedApiOrThrow, requestApi } from '../core/api/api'

export type ProjectOwnerApi = {
  id: string
  email: string
  username: string
  firstName?: string | null
  lastName?: string | null
  avatar: string | null
}

export type ProjectApi = {
  id: string
  name: string
  description: string | null
  systemPrompt: string
  ownerId: string
  owner: ProjectOwnerApi
  isPublic: boolean
  nodeCount: number
  memberCount: number
  shareToken?: string | null
  viewport: Viewport
  quickActions?: QuickAction[] | null
  createdAt: string
  updatedAt: string
}

export type ProjectDetailApi = ProjectApi & {
  members?: unknown[]
}

export type CreateProjectBody = {
  name: string
  description?: string
  systemPrompt?: string
  isPublic?: boolean
  viewport?: Viewport
  quickActions?: QuickAction[]
}

export type UpdateProjectBody = Partial<{
  name: string
  description: string
  systemPrompt: string
  isPublic: boolean
  viewport: Viewport
  quickActions: QuickAction[]
}>

export async function listProjectsApi(): Promise<ProjectApi[]> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectApi[]>(
    api.projects.projectsControllerListProjects(1, 200, '', 'updatedAt', 'desc')
  )
}

export async function getProjectApi(id: string): Promise<ProjectDetailApi> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectDetailApi>(api.projects.projectsControllerGetProject(id))
}

export async function createProjectApi(body: CreateProjectBody): Promise<ProjectApi> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectApi>(api.projects.projectsControllerCreateProject(body))
}

export async function updateProjectApi(id: string, body: UpdateProjectBody): Promise<ProjectApi> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectApi>(api.projects.projectsControllerUpdateProject(id, body))
}

export async function deleteProjectApi(id: string): Promise<void> {
  const api = getAuthenticatedApiOrThrow()
  await requestApi<void>(api.projects.projectsControllerDeleteProject(id))
}
