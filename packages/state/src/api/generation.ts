import type { GenerateNodeDto } from '@forky/client-api'
import { createEventSource, getAuthenticatedApiOrThrow, requestApi } from '../core/api/api'

export type GenerationStartResponse = {
  nodeId: string
  streamId: string
  status: string
  startedAt: string
}

export type CascadeResponse = {
  affectedNodes?: Array<{ nodeId: string; status?: string }>
}

export async function startNodeGenerationApi(params: {
  nodeId: string
  model: string
  temperature?: number
  maxTokens?: number
}): Promise<GenerationStartResponse> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<GenerationStartResponse>(
    api.nodesRoot.nodesRootControllerStartGeneration(params.nodeId, {
      model: params.model as GenerateNodeDto['model'],
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    })
  )
}

export async function cancelNodeGenerationApi(nodeId: string): Promise<void> {
  const api = getAuthenticatedApiOrThrow()
  await requestApi<void>(api.nodesRoot.nodesRootControllerCancelGeneration(nodeId))
}

export async function cascadeNodeGenerationApi(nodeId: string): Promise<CascadeResponse> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<CascadeResponse>(api.nodesRoot.nodesRootControllerCascadeUpdate(nodeId))
}

export function createNodeGenerationEventSource(nodeId: string, streamId: string): EventSource {
  return createEventSource(`nodes/${encodeURIComponent(nodeId)}/generate/${encodeURIComponent(streamId)}`)
}
