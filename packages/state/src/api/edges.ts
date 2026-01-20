import { getAuthenticatedApiOrThrow, requestApi } from '../core/api/api'

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
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectEdgeApi[]>(
    api.edges.edgesControllerListEdges(projectId, 1, 500)
  )
}

export async function createEdgeApi(projectId: string, body: CreateEdgeBody): Promise<ProjectEdgeApi> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<ProjectEdgeApi>(api.edges.edgesControllerCreateEdge(projectId, body))
}

export async function deleteEdgeApi(edgeId: string): Promise<void> {
  const api = getAuthenticatedApiOrThrow()
  await requestApi<void>(api.edgesRoot.edgesRootControllerDeleteEdge(edgeId))
}
