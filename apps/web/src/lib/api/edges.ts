import { apiJson } from './client'

export type ProjectEdgeApi = {
  id: string
  projectId: string
  sourceId: string
  targetId: string
  createdAt: string
}

export type CreateEdgeBody = {
  sourceId: string
  targetId: string
}

export async function listEdgesApi(projectId: string): Promise<ProjectEdgeApi[]> {
  return apiJson<ProjectEdgeApi[]>(`/api/projects/${encodeURIComponent(projectId)}/edges?limit=500`)
}

export async function createEdgeApi(projectId: string, body: CreateEdgeBody): Promise<ProjectEdgeApi> {
  return apiJson<ProjectEdgeApi>(`/api/projects/${encodeURIComponent(projectId)}/edges`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteEdgeApi(edgeId: string): Promise<void> {
  await apiJson<void>(`/api/edges/${encodeURIComponent(edgeId)}`, {
    method: 'DELETE',
  })
}
