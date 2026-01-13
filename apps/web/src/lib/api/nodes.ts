import { apiJson } from './client'

export type NodePosition = { x: number; y: number }

export type ProjectNodeApi = {
  id: string
  projectId: string
  prompt: string
  response: string | null
  summary?: string | null
  status: string
  position: NodePosition
  llmModel?: string | null
  llmTokens?: number | null
  parentIds: string[]
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type CreateNodeBody = {
  id?: string
  prompt: string
  position: NodePosition
  parentIds?: string[]
}

export type UpdateNodeBody = Partial<{
  prompt: string
  response: string | null
  summary: string | null
  status: string
  position: NodePosition
  metadata: Record<string, unknown>
}>

export async function listNodesApi(projectId: string): Promise<ProjectNodeApi[]> {
  return apiJson<ProjectNodeApi[]>(`/api/projects/${encodeURIComponent(projectId)}/nodes?limit=500`)
}

export async function createNodeApi(projectId: string, body: CreateNodeBody): Promise<ProjectNodeApi> {
  return apiJson<ProjectNodeApi>(`/api/projects/${encodeURIComponent(projectId)}/nodes`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateNodeApi(nodeId: string, body: UpdateNodeBody): Promise<ProjectNodeApi> {
  return apiJson<ProjectNodeApi>(`/api/nodes/${encodeURIComponent(nodeId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteNodeApi(nodeId: string): Promise<void> {
  await apiJson<void>(`/api/nodes/${encodeURIComponent(nodeId)}`, {
    method: 'DELETE',
  })
}
