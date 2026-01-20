'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { NodeMetadata, NodeStatus } from '@forky/shared-core'
import { useStore } from '../store'

export interface CollaborationHookProps {
  projectId: string
  token?: string
  onCursorMove?: (data: { userId: string; x: number; y: number }) => void
  onNodeUpdate?: (data: { userId: string; nodeId: string; data: unknown }) => void
  onNodeCreated?: (data: {
    node: { id: string; prompt: string; position: { x: number; y: number }; status: string }
    createdAt: string
  }) => void
  onNodeDeleted?: (data: { nodeId: string }) => void
  onNodeStreaming?: (data: {
    nodeId: string
    chunk?: string
    progress?: number
    done?: boolean
    summary?: string | null
    tokens?: number | null
  }) => void
  onUserJoin?: (data: { userId: string }) => void
  onUserLeave?: (data: { userId: string }) => void
}

export type CollaborationHookReturn = {
  moveCursor: (x: number, y: number) => void
  updateNode: (nodeId: string, data: unknown) => void
  createNode: (params: {
    projectId: string
    id?: string
    prompt: string
    position: { x: number; y: number }
    parentIds?: string[]
  }) => void
  deleteNode: (nodeId: string) => void
}

export const useCollaboration = ({
  projectId,
  token,
  onCursorMove,
  onNodeUpdate,
  onNodeStreaming,
  onNodeCreated,
  onNodeDeleted,
  onUserJoin,
  onUserLeave,
}: CollaborationHookProps): CollaborationHookReturn => {
  const socketRef = useRef<Socket | null>(null)

  const resolveSocketUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL
    if (envUrl) {
      try {
        const parsed = new URL(envUrl)
        if (typeof window !== 'undefined') {
          const windowHost = window.location.hostname
          if (parsed.hostname === 'localhost' && windowHost && windowHost !== 'localhost') {
            parsed.hostname = windowHost
          }
        }
        return `${parsed.protocol}//${parsed.host}`
      } catch {
        // Fall through to window-based fallback.
      }
    }

    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
      return `${protocol}//${window.location.hostname}:3001`
    }

    return 'http://localhost:3001'
  }

  const normalizeStatus = (status?: unknown): NodeStatus => {
    if (status === 'IDLE' || status === 'idle') return 'idle'
    if (status === 'COMPLETED' || status === 'completed') return 'idle'
    if (status === 'GENERATING' || status === 'loading') return 'loading'
    if (status === 'ERROR' || status === 'error') return 'error'
    if (status === 'STALE' || status === 'stale') return 'stale'
    return 'idle'
  }

  const normalizePosition = (value: unknown): { x: number; y: number } | null => {
    if (typeof value !== 'object' || value === null) return null
    const x = (value as { x?: unknown }).x
    const y = (value as { y?: unknown }).y
    if (typeof x !== 'number' || typeof y !== 'number') return null
    return { x, y }
  }

  const dispatchProjectTouch = useCallback(
    (updatedAt?: string) => {
      if (typeof window === 'undefined') return
      window.dispatchEvent(
        new CustomEvent('project:touch', {
          detail: {
            projectId,
            updatedAt: updatedAt ?? new Date().toISOString(),
          },
        })
      )
    },
    [projectId]
  )

  useEffect(() => {
    if (!projectId) return

    const url = resolveSocketUrl()
    socketRef.current = io(url, {
      path: '/socket.io',
      auth: token ? { token } : undefined,
      query: { projectId },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('Connected to collaboration server')
      socket.emit('join-project', { projectId })
    })

    const handleCursorMoved = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return
      if (!('userId' in data)) return
      if (!('cursor' in data)) return

      const userId = (data as { userId?: unknown }).userId
      const cursor = (data as { cursor?: unknown }).cursor

      if (typeof userId !== 'string') return
      if (typeof cursor !== 'object' || cursor === null) return

      const x = (cursor as { x?: unknown }).x
      const y = (cursor as { y?: unknown }).y

      if (typeof x !== 'number' || typeof y !== 'number') return

      onCursorMove?.({ userId, x, y })
    }

    socket.on('cursor:moved', handleCursorMoved)
    socket.on('cursor-update', handleCursorMoved)

    const handleNodeUpdated = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return
      const nodeId = (data as { nodeId?: unknown }).nodeId
      if (typeof nodeId !== 'string') return
      const updatedAtRaw = (data as { updatedAt?: unknown }).updatedAt
      const updatedAt =
        typeof updatedAtRaw === 'string' && updatedAtRaw.length > 0 ? updatedAtRaw : undefined

      const userId =
        typeof (data as { userId?: unknown }).userId === 'string'
          ? (data as { userId: string }).userId
          : 'unknown'

      const updates =
        (data as { updates?: unknown; data?: unknown }).updates ??
        (data as { data?: unknown }).data
      if (typeof updates === 'object' && updates !== null) {
        const normalized: Record<string, unknown> = { ...(updates as Record<string, unknown>) }
        if ('status' in normalized) {
          normalized.status = normalizeStatus(normalized.status)
        }
        if ('position' in normalized) {
          const position = normalizePosition(normalized.position)
          if (position) {
            normalized.position = position
          } else {
            delete normalized.position
          }
        }
        let parentIds: string[] | null = null
        if ('parentIds' in normalized) {
          if (Array.isArray(normalized.parentIds)) {
            parentIds = normalized.parentIds.filter(
              (item): item is string => typeof item === 'string' && item.length > 0
            )
            normalized.parentIds = parentIds
          } else {
            delete normalized.parentIds
          }
        }

        useStore.getState().updateNode(nodeId, normalized)
        if (parentIds !== null) {
          const state = useStore.getState()
          const edgesToRemove = Array.from(state.edges.values()).filter(
            (edge) => edge.target === nodeId && !parentIds.includes(edge.source)
          )

          edgesToRemove.forEach((edge) => {
            state.deleteEdge(edge.id)
          })

          parentIds.forEach((parentId) => {
            state.addEdge(parentId, nodeId)
          })
        }
      }

      onNodeUpdate?.({ userId, nodeId, data: updates })
      dispatchProjectTouch(updatedAt)
    }

    socket.on('node:updated', handleNodeUpdated)
    socket.on('node-updated', handleNodeUpdated)

    const handleNodeStreaming = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return
      const nodeId = (data as { nodeId?: unknown }).nodeId
      if (typeof nodeId !== 'string' || nodeId.length === 0) return

      const chunk = (data as { chunk?: unknown }).chunk
      const done = (data as { done?: unknown }).done
      const progress = (data as { progress?: unknown }).progress
      const summary = (data as { summary?: unknown }).summary
      const tokens = (data as { tokens?: unknown }).tokens

      const state = useStore.getState()
      const node = state.nodes.get(nodeId)
      if (!node) return

      if (typeof chunk === 'string' && chunk.length > 0) {
        if (node.status !== 'loading') {
          state.setNodeStatus(nodeId, 'loading')
        }
        state.updateNodeResponse(nodeId, `${node.response ?? ''}${chunk}`)
      }

      if (done === true) {
        state.setNodeStatus(nodeId, 'idle')
        if (typeof summary === 'string' && summary.trim()) {
          state.updateNodeSummary(nodeId, summary)
        }
      }

      onNodeStreaming?.({
        nodeId,
        chunk: typeof chunk === 'string' ? chunk : undefined,
        progress: typeof progress === 'number' ? progress : undefined,
        done: done === true,
        summary: typeof summary === 'string' ? summary : summary === null ? null : undefined,
        tokens: typeof tokens === 'number' ? tokens : tokens === null ? null : undefined,
      })
    }

    socket.on('node:streaming', handleNodeStreaming)

    const handleNodeCreated = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return
      const nodeData = (data as { node?: unknown }).node
      if (typeof nodeData !== 'object' || nodeData === null) return

      const id = (nodeData as { id?: unknown }).id
      const prompt = (nodeData as { prompt?: unknown }).prompt
      const position = (nodeData as { position?: unknown }).position
      const parentIdsRaw = (nodeData as { parentIds?: unknown }).parentIds
      const response = (nodeData as { response?: unknown }).response
      const summary = (nodeData as { summary?: unknown }).summary
      const statusRaw = (nodeData as { status?: unknown }).status
      const metadata = (nodeData as { metadata?: unknown }).metadata
      const createdAtRaw = (nodeData as { createdAt?: unknown }).createdAt
      const updatedAtRaw = (nodeData as { updatedAt?: unknown }).updatedAt

      if (
        typeof id !== 'string' ||
        typeof prompt !== 'string' ||
        typeof position !== 'object' ||
        position === null
      )
        return

      const x = (position as { x?: unknown }).x
      const y = (position as { y?: unknown }).y

      if (typeof x !== 'number' || typeof y !== 'number') return

      const state = useStore.getState()
      const status = normalizeStatus(statusRaw)
      const parentIds = Array.isArray(parentIdsRaw)
        ? parentIdsRaw.filter((item): item is string => typeof item === 'string')
        : []
      const createdAt = typeof createdAtRaw === 'string' ? new Date(createdAtRaw) : new Date()
      const updatedAt = typeof updatedAtRaw === 'string' ? new Date(updatedAtRaw) : createdAt

      if (state.nodes.has(id)) {
        state.updateNode(id, {
          prompt,
          position: { x, y },
          status,
          ...(parentIds.length ? { parentIds } : {}),
          ...(typeof response === 'string' ? { response } : {}),
          ...(typeof summary === 'string' ? { summary } : {}),
          ...(metadata && typeof metadata === 'object' ? { metadata } : {}),
        })
      } else {
        const nextNodes = new Map(state.nodes)
        nextNodes.set(id, {
          id,
          prompt,
          response: typeof response === 'string' ? response : '',
          summary: typeof summary === 'string' ? summary : undefined,
          status,
          position: { x, y },
          parentIds,
          childrenIds: [],
          createdAt,
          updatedAt,
          metadata: metadata && typeof metadata === 'object' ? (metadata as NodeMetadata) : undefined,
        })
        state.setNodes(nextNodes)
        if (parentIds.length) {
          parentIds.forEach((parentId) => {
            state.addEdge(parentId, id)
          })
        }
      }

      onNodeCreated?.({
        node: {
          id,
          prompt,
          position: { x, y },
          status,
        },
        createdAt: new Date().toISOString(),
      })
      dispatchProjectTouch(
        typeof updatedAtRaw === 'string' && updatedAtRaw.length > 0
          ? updatedAtRaw
          : typeof createdAtRaw === 'string' && createdAtRaw.length > 0
            ? createdAtRaw
            : undefined
      )
    }

    socket.on('node:created', handleNodeCreated)

    const handleNodeDeleted = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return
      const nodeId = (data as { nodeId?: unknown }).nodeId
      if (typeof nodeId !== 'string' || nodeId.length === 0) return
      const deletedAtRaw = (data as { deletedAt?: unknown }).deletedAt

      useStore.getState().deleteNode(nodeId)
      onNodeDeleted?.({ nodeId })
      dispatchProjectTouch(
        typeof deletedAtRaw === 'string' && deletedAtRaw.length > 0 ? deletedAtRaw : undefined
      )
    }

    socket.on('node:deleted', handleNodeDeleted)

    const handleUserJoined = (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'userId' in data) {
        const userId = (data as { userId?: unknown }).userId
        if (typeof userId === 'string') {
          onUserJoin?.({ userId })
        }
      }
    }

    const handleUserLeft = (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'userId' in data) {
        const userId = (data as { userId?: unknown }).userId
        if (typeof userId === 'string') {
          onUserLeave?.({ userId })
        }
      }
    }

    socket.on('user:joined', handleUserJoined)
    socket.on('user-joined', handleUserJoined)

    socket.on('user:left', handleUserLeft)
    socket.on('user-left', handleUserLeft)

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [
    projectId,
    token,
    onCursorMove,
    onNodeUpdate,
    onNodeStreaming,
    onNodeCreated,
    onNodeDeleted,
    onUserJoin,
    onUserLeave,
    dispatchProjectTouch,
  ])

  const moveCursor = useCallback(
    (x: number, y: number) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('cursor:move', { projectId, x, y })
        socketRef.current.emit('move-cursor', { projectId, x, y })
      }
    },
    [projectId]
  )

  const updateNode = useCallback(
    (nodeId: string, data: unknown) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('node:update', { projectId, nodeId, data })
        socketRef.current.emit('update-node', { projectId, nodeId, data })
      }
    },
    [projectId]
  )

  const createNode = useCallback(
    (params: {
      projectId: string
      id?: string
      prompt: string
      position: { x: number; y: number }
      parentIds?: string[]
    }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('node:create', {
          ...params,
        })
        socketRef.current.emit('create-node', {
          ...params,
        })
      }
    },
    [projectId]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('node:delete', { projectId, nodeId })
      }
    },
    [projectId]
  )

  return {
    moveCursor,
    updateNode,
    createNode,
    deleteNode,
  }
}
