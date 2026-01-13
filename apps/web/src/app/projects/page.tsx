'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, ProjectLayout } from '@forky/ui'
import { Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { setLastProjectId } from '@/lib/user-preferences'
import { saveProject } from '@/features/projects/services/project-service'
import { useProjects } from '@/features/projects/hooks/useProjects'

export default function ProjectsPage() {
  const router = useRouter()

  const { projects, isLoading, error } = useProjects()

  const clearAll = useStore((s) => s.clearAll)
  const setCurrentProjectId = useStore((s) => s.setCurrentProjectId)
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName)
  const settings = useStore((s) => s.settings)
  const quickActions = useStore((s) => s.quickActions)
  const viewport = useStore((s) => s.viewport)

  const handleNewProject = async () => {
    clearAll()

    const name = 'Projet sans titre'
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
  }

  return (
    <ProjectLayout
      header={
        <div className="flex h-full items-center justify-between px-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Projets</h1>
          <Button onClick={() => void handleNewProject()} icon={<Plus className="h-4 w-4" />}>
            Nouveau projet
          </Button>
        </div>
      }
    >
      <div className="p-6">
        {error ? (
          <div className="text-sm text-red-600 dark:text-red-400">{error.message}</div>
        ) : null}

        {isLoading ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">Chargement…</div>
        ) : null}

        {!isLoading && projects.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">Aucun projet.</div>
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
                {project.nodeCount} nœud{project.nodeCount !== 1 ? 's' : ''}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </ProjectLayout>
  )
}
