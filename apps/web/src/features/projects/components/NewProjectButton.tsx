'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button, Modal } from '@forky/ui'
import { ApiError } from '@/lib/api/client'
import { useStore } from '@/lib/store'
import { setLastProjectId } from '@/lib/user-preferences'
import { listProjects, loadProject, saveProject } from '../services/project-service'

export function NewProjectButton() {
  const router = useRouter()

  const storeLoadProject = useStore((s) => s.loadProject)
  const setCurrentProjectId = useStore((s) => s.setCurrentProjectId)
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName)
  const setViewport = useStore((s) => s.setViewport)
  const settings = useStore((s) => s.settings)
  const quickActions = useStore((s) => s.quickActions)
  const viewport = useStore((s) => s.viewport)
  const currentProjectId = useStore((s) => s.currentProjectId)

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
    const projects = await listProjects()
    return projects[0]?.id ?? null
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

  const handleClick = async () => {
    try {
      const created = await saveProject({
        id: null,
        name: defaultProjectName,
        nodes: [],
        edges: [],
        settings,
        quickActions,
        viewport,
      })

      applyEmptyProject(created.id, created.name)
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
      <button
        onClick={() => void handleClick()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500
                  hover:bg-blue-600 text-white font-medium rounded-lg transition-colors
                  active:scale-95"
        type="button"
      >
        <Plus className="w-5 h-5" />
        New Project
      </button>

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
            <Button type="button" onClick={() => void handleResetProject()} loading={pendingAction === 'reset'} disabled={isResolving}>
              Reset
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
