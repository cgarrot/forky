import type { QuickAction, Viewport } from '@forky/shared'
import { apiJson } from './client'

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
  viewport: Viewport | null
  quickActions: QuickAction[] | null
}>

export async function listProjectsApi(): Promise<ProjectApi[]> {
  return apiJson<ProjectApi[]>('/api/projects')
}

export async function getProjectApi(id: string): Promise<ProjectDetailApi> {
  return apiJson<ProjectDetailApi>(`/api/projects/${encodeURIComponent(id)}`)
}

export async function createProjectApi(body: CreateProjectBody): Promise<ProjectApi> {
  return apiJson<ProjectApi>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateProjectApi(id: string, body: UpdateProjectBody): Promise<ProjectApi> {
  return apiJson<ProjectApi>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteProjectApi(id: string): Promise<void> {
  await apiJson<void>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
