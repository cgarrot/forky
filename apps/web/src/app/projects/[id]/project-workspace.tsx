'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout, Button } from '@forky/ui'
import { ArrowLeft } from 'lucide-react'
import { ReactFlowProvider } from '@xyflow/react'
import { Sidebar } from '@/features/sidebar'
import { SaveIndicator } from '@/components/ui/SaveIndicator'
import { Canvas, CanvasFocusOverlay, BuildSetupOverlay } from '@/features/canvas'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useCollaboration } from '@/features/collaboration/hooks/useCollaboration'
import { useStore } from '@/lib/store'
import { setLastProjectId } from '@/lib/user-preferences'

type RemoteCursor = {
  x: number
  y: number
  lastSeen: number
  color: string
}

const cursorPalette = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#eab308', '#ef4444']

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { loadProjectById } = useProjects()
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(() => new Map())
  const loadedProjectIdRef = useRef<string | null>(null)
  const cursorRafRef = useRef<number | null>(null)
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null)

  const colorForUser = useCallback((userId: string) => {
    let hash = 0
    for (const char of userId) {
      hash = (hash + char.charCodeAt(0)) % cursorPalette.length
    }
    return cursorPalette[hash] ?? '#3b82f6'
  }, [])

  const handleCursorMove = useCallback(
    (data: { userId: string; x: number; y: number }) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev)
        const existing = next.get(data.userId)
        next.set(data.userId, {
          x: data.x,
          y: data.y,
          lastSeen: Date.now(),
          color: existing?.color ?? colorForUser(data.userId),
        })
        return next
      })
    },
    [colorForUser]
  )

  const handleUserLeave = useCallback((data: { userId: string }) => {
    setRemoteCursors((prev) => {
      if (!prev.has(data.userId)) return prev
      const next = new Map(prev)
      next.delete(data.userId)
      return next
    })
  }, [])

  const { createNode, updateNode, deleteNode, moveCursor } = useCollaboration({
    projectId,
    onCursorMove: handleCursorMove,
    onUserLeave: handleUserLeave,
  })

  useEffect(() => {
    if (loadedProjectIdRef.current === projectId) {
      return
    }

    loadedProjectIdRef.current = projectId
    void setLastProjectId(projectId)

    const run = async () => {
      const loaded = await loadProjectById(projectId)
      if (loaded) {
        try {
          sessionStorage.removeItem('shareToken')
        } catch {
          // Ignore storage errors.
        }
        return
      }

      let shareToken: string | null = null
      try {
        shareToken = sessionStorage.getItem('shareToken')
      } catch {
        shareToken = null
      }
      if (!shareToken) {
        return
      }

      try {
        sessionStorage.removeItem('shareToken')
      } catch {
        // Ignore storage errors.
      }
      window.location.assign(`/api/guest/join/redirect?token=${encodeURIComponent(shareToken)}`)
    }

    void run()
  }, [projectId, loadProjectById])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pendingCursorRef.current = { x: event.clientX, y: event.clientY }
      if (cursorRafRef.current !== null) {
        return
      }

      cursorRafRef.current = window.requestAnimationFrame(() => {
        cursorRafRef.current = null
        const pending = pendingCursorRef.current
        if (!pending) return
        moveCursor(pending.x, pending.y)
      })
    }

    window.addEventListener('pointermove', handlePointerMove)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (cursorRafRef.current !== null) {
        window.cancelAnimationFrame(cursorRafRef.current)
        cursorRafRef.current = null
      }
    }
  }, [moveCursor])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now()
      setRemoteCursors((prev) => {
        let changed = false
        const next = new Map(prev)
        for (const [userId, cursor] of next) {
          if (now - cursor.lastSeen > 5000) {
            next.delete(userId)
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 2000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleCreate = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string }>).detail
      if (!detail?.nodeId) return
      const node = useStore.getState().nodes.get(detail.nodeId)
      if (!node) return

      createNode({
        projectId,
        id: node.id,
        prompt: node.prompt,
        position: node.position,
        parentIds: node.parentIds,
      })
    }

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string; data: unknown }>).detail
      if (!detail?.nodeId) return
      updateNode(detail.nodeId, detail.data)
    }

    const handleDelete = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string }>).detail
      if (!detail?.nodeId) return
      deleteNode(detail.nodeId)
    }

    window.addEventListener('node:ws-create', handleCreate)
    window.addEventListener('node:ws-update', handleUpdate)
    window.addEventListener('node:ws-delete', handleDelete)

    return () => {
      window.removeEventListener('node:ws-create', handleCreate)
      window.removeEventListener('node:ws-update', handleUpdate)
      window.removeEventListener('node:ws-delete', handleDelete)
    }
  }, [projectId, createNode, updateNode, deleteNode])


  return (
    <AppLayout sidebar={<Sidebar />} sidebarWidth={280}>
      <div className="absolute top-4 left-4 z-10">
        <Link href="/projects">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Back to projects
          </Button>
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <SaveIndicator />
      </div>

      {remoteCursors.size > 0 && (
        <div className="pointer-events-none fixed inset-0 z-20">
          {Array.from(remoteCursors.entries()).map(([userId, cursor]) => (
            <div
              key={userId}
              className="absolute"
              style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
            >
              <div className="flex items-center gap-1">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-white shadow"
                  style={{ backgroundColor: cursor.color }}
                />
                <span className="text-[10px] text-gray-700 bg-white/90 px-1 py-0.5 rounded shadow">
                  {userId.slice(-4)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>

      <CanvasFocusOverlay />
      <BuildSetupOverlay />
    </AppLayout>
  )
}
