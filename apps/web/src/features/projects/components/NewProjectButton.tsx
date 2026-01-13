'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { setLastProjectId } from '@/lib/user-preferences'
import { saveProject } from '../services/project-service'

export function NewProjectButton() {
  const router = useRouter()

  const clearAll = useStore((s) => s.clearAll)
  const setCurrentProjectId = useStore((s) => s.setCurrentProjectId)
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName)
  const settings = useStore((s) => s.settings)
  const quickActions = useStore((s) => s.quickActions)
  const viewport = useStore((s) => s.viewport)

  const handleClick = async () => {
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
    <button
      onClick={() => void handleClick()}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500
                 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors
                 active:scale-95"
      type="button"
    >
      <Plus className="w-5 h-5" />
      Nouveau Projet
    </button>
  )
}
