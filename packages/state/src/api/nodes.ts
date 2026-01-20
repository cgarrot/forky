import type { UpdateNodeDtoStatusEnum } from '@forky/client-api'
import { getAuthenticatedApiOrThrow, requestApi } from '../core/api/api'

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
  response: string
  summary: string
  status: UpdateNodeDtoStatusEnum
  position: NodePosition
  parentIds: string[]
  metadata: Record<string, unknown>
}>

export async function listNodesApi(projectId: string): Promise<ProjectNodeApi[]> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectNodeApi[]>(
    api.nodes.nodesControllerListNodes(projectId, 1, 500, '', '')
  )
}

export async function createNodeApi(projectId: string, body: CreateNodeBody): Promise<ProjectNodeApi> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectNodeApi>(api.nodes.nodesControllerCreateNode(projectId, body))
}

export async function updateNodeApi(nodeId: string, body: UpdateNodeBody): Promise<ProjectNodeApi> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectNodeApi>(api.nodesRoot.nodesRootControllerUpdateNode(nodeId, body))
}

export async function deleteNodeApi(nodeId: string): Promise<void> {
  const api = getAuthenticatedApiOrThrow()
  await requestApi<void>(api.nodesRoot.nodesRootControllerDeleteNode(nodeId))
}
