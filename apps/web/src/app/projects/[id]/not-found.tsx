import Link from 'next/link'
import { AppLayout, Button } from '@forky/ui'

export default function ProjectNotFound() {
  return (
    <AppLayout>
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Projet introuvable</div>
          <Link href="/projects">
            <Button>Retour aux projets</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
