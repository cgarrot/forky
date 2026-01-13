'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Edge, Node, QuickAction, Settings, Viewport } from '@forky/shared'
import { useStore } from '@/lib/store'
import {
  deleteProject,
  duplicateProject,
  exportProject,
  getProjectStored,
  importProject,
  listProjects,
  loadProject,
} from '../services/project-service'
import type { ProjectListItem } from '../types'
import { exportProjectAsMarkdown } from '../utils'

type LoadProjectResult = {
  id: string
  name: string
  nodes: Node[]
  edges: Edge[]
  systemPrompt: string
  quickActions: QuickAction[]
  viewport: Viewport
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const storeLoadProject = useStore((s) => s.loadProject)
  const setViewport = useStore((s) => s.setViewport)
  const setCurrentProjectId = useStore((s) => s.setCurrentProjectId)
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName)

  const currentProjectId = useStore((s) => s.currentProjectId)

  const settings = useStore((s) => s.settings)

  const currentProject = useMemo(() => {
    if (!currentProjectId) return null
    return projects.find((p) => p.id === currentProjectId) ?? null
  }, [projects, currentProjectId])

  const applyLoadedProject = useCallback(
    (loaded: LoadProjectResult) => {
      const nextSettings: Settings = {
        ...settings,
        systemPrompt: loaded.systemPrompt,
      }

      storeLoadProject(loaded.nodes, loaded.edges, nextSettings, loaded.quickActions)
      setViewport(loaded.viewport)
      setCurrentProjectId(loaded.id)
      setCurrentProjectName(loaded.name)
    },
    [settings, storeLoadProject, setViewport, setCurrentProjectId, setCurrentProjectName]
  )

  const refreshProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const next = await listProjects()
      setProjects(next)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load projects'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  const loadProjectById = useCallback(
    async (projectId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const loaded = await loadProject(projectId)
        if (!loaded) return null

        applyLoadedProject(loaded)
        await refreshProjects()

        return loaded
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load project'))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [applyLoadedProject, refreshProjects]
  )

  const deleteProjectById = useCallback(
    async (projectId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        await deleteProject(projectId)
        await refreshProjects()

        if (currentProjectId === projectId) {
          setCurrentProjectId(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete project'))
      } finally {
        setIsLoading(false)
      }
    },
    [currentProjectId, refreshProjects, setCurrentProjectId]
  )

  const duplicateProjectById = useCallback(
    async (projectId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const duplicated = await duplicateProject(projectId)
        await refreshProjects()
        return duplicated
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to duplicate project'))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [refreshProjects]
  )

  const exportProjectById = useCallback(
    async (projectId: string, format: 'json' | 'md') => {
      if (format === 'json') {
        return exportProject(projectId)
      }

      const project = await getProjectStored(projectId)
      return exportProjectAsMarkdown(project)
    },
    []
  )

  const importProjectJson = useCallback(
    async (json: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const imported = await importProject(json)
        await refreshProjects()
        return imported
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to import project'))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [refreshProjects]
  )

  return {
    projects,
    currentProject,
    isLoading,
    error,
    refreshProjects,
    loadProjectById,
    deleteProjectById,
    duplicateProject: duplicateProjectById,
    exportProject: exportProjectById,
    importProjectJson,
  }
}
