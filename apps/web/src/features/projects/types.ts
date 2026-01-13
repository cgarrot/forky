import type { Edge, Node, QuickAction, Viewport } from '@forky/shared'

export type StoredNode = Omit<Node, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

export type StoredEdge = Omit<Edge, 'createdAt'> & {
  createdAt: string
}

export type ProjectListItem = {
  id: string
  name: string
  nodeCount: number
  createdAt: string
  updatedAt: string
}

export type StoredProject = {
  id: string
  name: string
  nodes: StoredNode[]
  edges: StoredEdge[]
  systemPrompt: string
  quickActions: QuickAction[]
  viewport: Viewport
  createdAt: string
  updatedAt: string
}
