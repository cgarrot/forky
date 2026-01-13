'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AppLayout, Button } from '@forky/ui'

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Project route error:', error)
  }, [error])

  return (
    <AppLayout>
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Une erreur est survenue</div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={reset}>Réessayer</Button>
            <Link href="/projects">
              <Button variant="secondary">Projets</Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
