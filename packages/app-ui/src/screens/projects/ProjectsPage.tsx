'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button, Modal, ProjectLayout } from '@forky/ui'
import { ApiError, setLastProjectId, useStore } from '@forky/state'
import { listProjects, loadProject, saveProject } from '../../features/projects/services/project-service'
import { useProjects } from '../../features/projects/hooks/useProjects'

export function ProjectsPage() {
  const router = useRouter()

  const { projects, isLoading, error } = useProjects()

  const clearAll = useStore((s) => s.clearAll)
  const setCurrentProjectId = useStore((s) => s.setCurrentProjectId)
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName)
  const settings = useStore((s) => s.settings)
  const quickActions = useStore((s) => s.quickActions)
  const viewport = useStore((s) => s.viewport)
  const currentProjectId = useStore((s) => s.currentProjectId)
  const storeLoadProject = useStore((s) => s.loadProject)
  const setViewport = useStore((s) => s.setViewport)

  const [isGuestLimitOpen, setIsGuestLimitOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'open' | 'reset' | null>(null)

  const isResolving = pendingAction !== null
  const defaultProjectName = 'Untitled project'

  const applyLoadedProject = (loaded: Awaited<ReturnType<typeof loadProject>> | null) => {
    if (!loaded) return
    storeLoadProject(loaded.nodes, loaded.edges, { ...settings, systemPrompt: loaded.systemPrompt }, loaded.quickActions)
    setViewport(loaded.viewport)
    setCurrentProjectId(loaded.id)
    setCurrentProjectName(loaded.name)
  }

  const applyEmptyProject = (projectId: string, projectName: string) => {
    storeLoadProject([], [], settings, quickActions)
    setCurrentProjectId(projectId)
    setCurrentProjectName(projectName)
  }

  const resolveFallbackProjectId = async () => {
    if (currentProjectId) return currentProjectId
    const projectsList = await listProjects()
    return projectsList[0]?.id ?? null
  }

  const openExistingProject = async () => {
    const projectId = await resolveFallbackProjectId()
    if (!projectId) {
      throw new ApiError('Project not found', 404)
    }

    const loaded = await loadProject(projectId)
    if (!loaded) {
      throw new ApiError('Project not found', 404)
    }

    applyLoadedProject(loaded)
    await setLastProjectId(loaded.id)
    router.push(`/projects/${loaded.id}`)
  }

  const resetExistingProject = async () => {
    const projectId = await resolveFallbackProjectId()
    if (!projectId) {
      throw new ApiError('Project not found', 404)
    }

    const resetProject = await saveProject({
      id: projectId,
      name: defaultProjectName,
      nodes: [],
      edges: [],
      settings,
      quickActions,
      viewport,
    })

    applyEmptyProject(resetProject.id, resetProject.name)
    await setLastProjectId(resetProject.id)
    router.push(`/projects/${resetProject.id}`)
  }

  const handleNewProject = async () => {
    try {
      clearAll()

      const name = defaultProjectName
      setCurrentProjectName(name)

      const created = await saveProject({
        id: null,
        name,
        nodes: [],
        edges: [],
        settings,
        quickActions,
        viewport,
      })

      setCurrentProjectId(created.id)
      await setLastProjectId(created.id)
      router.push(`/projects/${created.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setIsGuestLimitOpen(true)
        return
      }

      window.dispatchEvent(new CustomEvent('storage_error', { detail: { error } }))
    }
  }

  const handleOpenExisting = async () => {
    if (isResolving) return
    setPendingAction('open')
    try {
      await openExistingProject()
    } catch (fallbackError) {
      window.dispatchEvent(new CustomEvent('storage_error', { detail: { error: fallbackError } }))
    } finally {
      setPendingAction(null)
      setIsGuestLimitOpen(false)
    }
  }

  const handleResetProject = async () => {
    if (isResolving) return
    setPendingAction('reset')
    try {
      await resetExistingProject()
    } catch (fallbackError) {
      window.dispatchEvent(new CustomEvent('storage_error', { detail: { error: fallbackError } }))
    } finally {
      setPendingAction(null)
      setIsGuestLimitOpen(false)
    }
  }

  return (
    <>
      <ProjectLayout
        header={
          <div className="flex h-full items-center justify-between px-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
            <Button onClick={() => void handleNewProject()} icon={<Plus className="h-4 w-4" />}>
              New project
            </Button>
          </div>
        }
      >
        <div className="p-6">
          {error ? (
            <div className="text-sm text-red-600 dark:text-red-400">{error.message}</div>
          ) : null}

          {isLoading ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">Loading…</div>
          ) : null}

          {!isLoading && projects.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">No projects.</div>
          ) : null}

          <div className="mt-4 grid gap-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-700"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{project.name}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {project.nodeCount} node{project.nodeCount !== 1 ? 's' : ''}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </ProjectLayout>

      <Modal
        isOpen={isGuestLimitOpen}
        onClose={() => {
          if (!isResolving) {
            setIsGuestLimitOpen(false)
          }
        }}
        title="Guest project already exists"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            A guest can only create one project. You can reset the current project
            or continue working on it.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleOpenExisting()}
              loading={pendingAction === 'open'}
              disabled={isResolving}
            >
              Continue
            </Button>
            <Button
              type="button"
              onClick={() => void handleResetProject()}
              loading={pendingAction === 'reset'}
              disabled={isResolving}
            >
              Reset
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
