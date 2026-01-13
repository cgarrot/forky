'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { AppLayout, Button } from '@forky/ui'
import { ArrowLeft } from 'lucide-react'
import { ReactFlowProvider } from '@xyflow/react'
import { Sidebar } from '@/features/sidebar'
import { SaveIndicator } from '@/components/ui/SaveIndicator'
import { Canvas, CanvasFocusOverlay, BuildSetupOverlay } from '@/features/canvas'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { setLastProjectId } from '@/lib/user-preferences'

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { loadProjectById } = useProjects()
  const loadedProjectIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (loadedProjectIdRef.current === projectId) {
      return
    }

    loadedProjectIdRef.current = projectId
    void setLastProjectId(projectId)
    void loadProjectById(projectId)
  }, [projectId, loadProjectById])


  return (
    <AppLayout sidebar={<Sidebar />} sidebarWidth={280}>
      <div className="absolute top-4 left-4 z-10">
        <Link href="/projects">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Retour aux projets
          </Button>
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <SaveIndicator />
      </div>

      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>

      <CanvasFocusOverlay />
      <BuildSetupOverlay />
    </AppLayout>
  )
}
