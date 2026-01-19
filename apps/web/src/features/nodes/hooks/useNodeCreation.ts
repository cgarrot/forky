'use client'

import { useCallback } from 'react'
import { useStore } from '@/lib/store'

export function useNodeCreation(projectId: string | null) {
  const addNode = useStore((s) => s.addNode)
  const addNodeWithPrompt = useStore((s) => s.addNodeWithPrompt)
  const updateNode = useStore((s) => s.updateNode)
  const deleteNode = useStore((s) => s.deleteNode)

  const emitNodeCreated = useCallback((nodeId: string) => {
    const event = new CustomEvent('node:ws-create', { detail: { nodeId } })
    window.dispatchEvent(event)
  }, [])

  const emitNodeDeleted = useCallback((nodeId: string) => {
    const event = new CustomEvent('node:ws-delete', { detail: { nodeId } })
    window.dispatchEvent(event)
  }, [])

  const emitNodeUpdated = useCallback((nodeId: string, data: unknown) => {
    const event = new CustomEvent('node:ws-update', { detail: { nodeId, data } })
    window.dispatchEvent(event)
  }, [])

  const handleNodeCreated = useCallback(
    (nodeId: string) => {
      if (projectId) {
        emitNodeCreated(nodeId)
      }
    },
    [projectId, emitNodeCreated]
  )

  const handleNodeDeleted = useCallback(
    (nodeId: string) => {
      if (projectId) {
        emitNodeDeleted(nodeId)
      }
    },
    [projectId, emitNodeDeleted]
  )

  const handleNodeUpdated = useCallback(
    (nodeId: string, data: unknown) => {
      if (projectId) {
        emitNodeUpdated(nodeId, data)
      }
    },
    [projectId, emitNodeUpdated]
  )

  return {
    addNode,
    addNodeWithPrompt,
    updateNode,
    deleteNode,
    handleNodeCreated,
    handleNodeDeleted,
    handleNodeUpdated,
  }
}
