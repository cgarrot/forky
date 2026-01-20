'use client'

import { useEffect } from 'react'
import type { Settings } from '@forky/shared-core'
import { useStore, getLastProjectId } from '@forky/state'
import { loadProject } from '../services/project-service'

export function useRestoreLastProject() {
  const nodes = useStore((s) => s.nodes)
  const settings = useStore((s) => s.settings)

  const storeLoadProject = useStore((s) => s.loadProject)
  const setViewport = useStore((s) => s.setViewport)
  const setCurrentProjectId = useStore((s) => s.setCurrentProjectId)
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName)

  useEffect(() => {
    if (nodes.size > 0) {
      return
    }

    void (async () => {
      const lastProjectId = await getLastProjectId()
      if (!lastProjectId) {
        return
      }

      const loaded = await loadProject(lastProjectId)
      if (!loaded) {
        return
      }

      const nextSettings: Settings = {
        ...settings,
        systemPrompt: loaded.systemPrompt,
      }

      storeLoadProject(loaded.nodes, loaded.edges, nextSettings, loaded.quickActions)
      setViewport(loaded.viewport)
      setCurrentProjectId(loaded.id)
      setCurrentProjectName(loaded.name)
    })()
  }, [
    nodes,
    settings,
    storeLoadProject,
    setViewport,
    setCurrentProjectId,
    setCurrentProjectName,
  ])
}
