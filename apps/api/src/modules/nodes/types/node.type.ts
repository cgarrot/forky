export type NodeStatus = 'IDLE' | 'GENERATING' | 'COMPLETED' | 'ERROR' | 'STALE'

export type NodePosition = {
  x: number
  y: number
}

export type ProjectNode = {
  id: string
  projectId: string
  prompt: string
  response: string | null
  summary: string | null
  status: NodeStatus
  position: NodePosition
  llmModel: string | null
  llmTokens: number | null
  parentIds: string[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
