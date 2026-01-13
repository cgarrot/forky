'use client'

import { useEffect } from 'react'
import { Button, ProjectLayout } from '@forky/ui'

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Projects route error:', error)
  }, [error])

  return (
    <ProjectLayout
      header={
        <div className="flex h-full items-center justify-between px-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Projets</h1>
        </div>
      }
    >
      <div className="p-6">
        <div className="text-sm text-red-600 dark:text-red-400">Une erreur est survenue.</div>
        <div className="mt-4">
          <Button onClick={reset}>Réessayer</Button>
        </div>
      </div>
    </ProjectLayout>
  )
}
