'use client'

import { useEffect, useRef } from 'react'
import { useStore, mapToArray } from '@forky/state'
import { saveProject } from '../services/project-service'

export function useAutoSave(expectedProjectId?: string) {
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const settings = useStore((s) => s.settings)
  const quickActions = useStore((s) => s.quickActions)
  const viewport = useStore((s) => s.viewport)
  const currentProjectId = useStore((s) => s.currentProjectId)
  const currentProjectName = useStore((s) => s.currentProjectName)
  const setCurrentProjectId = useStore((s) => s.setCurrentProjectId)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (nodes.size === 0) {
      return
    }

    if (!currentProjectId) {
      return
    }

    if (expectedProjectId && currentProjectId !== expectedProjectId) {
      return
    }

    window.dispatchEvent(new CustomEvent('project:saving'))

    saveTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          const result = await saveProject({
            id: currentProjectId,
            name: currentProjectName,
            nodes: mapToArray(nodes),
            edges: mapToArray(edges),
            settings,
            quickActions,
            viewport,
          })

          if (result.id !== currentProjectId) {
            setCurrentProjectId(result.id)
          }

          window.dispatchEvent(
            new CustomEvent('project:saved', {
              detail: { id: result.id, savedAt: new Date().toISOString() },
            })
          )
        } catch (error) {
          window.dispatchEvent(new CustomEvent('storage_error', { detail: { error } }))
        }
      })()
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [
    nodes,
    edges,
    settings,
    quickActions,
    viewport,
    currentProjectId,
    currentProjectName,
    expectedProjectId,
    setCurrentProjectId,
  ])
}
