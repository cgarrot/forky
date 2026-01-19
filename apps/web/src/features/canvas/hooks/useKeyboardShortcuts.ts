'use client'

import { useCallback, useEffect } from 'react'
import { useSelectedNodeIds, useStore, useViewport } from '@/lib/store'

export function useKeyboardShortcuts() {
  const addNode = useStore((s) => s.addNode)
  const deleteNode = useStore((s) => s.deleteNode)
  const clearSelection = useStore((s) => s.clearSelection)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const selectedNodeIds = useSelectedNodeIds()
  const viewport = useViewport()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return
      }

      const isMeta = event.metaKey || event.ctrlKey

      if (isMeta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (isMeta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }

      if (isMeta && event.key === 'n') {
        event.preventDefault()
        const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom
        const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom
        const nodeId = addNode({ x: centerX, y: centerY })
        window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId } }))
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        selectedNodeIds.forEach((id) => {
          deleteNode(id)
          window.dispatchEvent(new CustomEvent('node:ws-delete', { detail: { nodeId: id } }))
        })
      }

      if (event.key === 'Escape') {
        clearSelection()
      }

      if (isMeta && event.key === 'Enter') {
        event.preventDefault()
        selectedNodeIds.forEach((nodeId) => {
          const customEvent = new CustomEvent('node:generate', { detail: { nodeId } })
          window.dispatchEvent(customEvent)
        })
      }
    },
    [addNode, deleteNode, clearSelection, redo, selectedNodeIds, undo, viewport]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
