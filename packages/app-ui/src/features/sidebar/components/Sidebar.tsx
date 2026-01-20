'use client'

import { useCallback, useState } from 'react'
import { Brush, Copy } from 'lucide-react'
import {
  NewProjectButton,
  NewNodeButton,
  SystemPromptEditor,
  QuickActionsList,
  QuickActionModal,
  ProjectList,
} from '../../projects'
import { Sidebar as UiSidebar, useToast } from '@forky/ui'
import { getProjectApi, updateNodeApi, useStore } from '@forky/state'
import type { EdgeMap, NodeMap } from '@forky/shared-core'
import { autoLayout } from '@forky/shared-core'
import { useSidebar } from '../hooks/useSidebar'

export function Sidebar() {
  const { isOpen, toggle, activeModal } = useSidebar()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const updateNode = useStore((s) => s.updateNode)
  const { showToast } = useToast()
  const [cachedShare, setCachedShare] = useState<{
    projectId: string
    url: string
  } | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [isTidying, setIsTidying] = useState(false)

  const hasNodes = nodes.size > 0

  const handleCopyShare = useCallback(async () => {
    if (!currentProjectId) {
      showToast({
        type: 'warning',
        title: 'No project open',
        message: 'Open a project to share the link.',
      })
      return
    }

    setIsCopying(true)
    try {
      let url =
        cachedShare?.projectId === currentProjectId ? cachedShare.url : null

      if (!url) {
        const project = await getProjectApi(currentProjectId)
        const shareToken = project.shareToken
        if (!shareToken) {
          showToast({
            type: 'error',
            title: 'Link unavailable',
            message: 'This project does not have a share link.',
          })
          return
        }

        if (typeof window === 'undefined') {
          showToast({
            type: 'error',
            title: 'Link unavailable',
            message: 'Unable to generate the link.',
          })
          return
        }

        url = `${window.location.origin}/s/${shareToken}`
        setCachedShare({ projectId: currentProjectId, url })
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      showToast({
        type: 'success',
        title: 'Link copied',
        message: 'Share it to join the project.',
      })
    } catch {
      showToast({
        type: 'error',
        title: 'Copy failed',
        message: 'Please try again in a moment.',
      })
    } finally {
      setIsCopying(false)
    }
  }, [cachedShare, currentProjectId, showToast])

  const handleAutoLayout = useCallback(() => {
    if (!hasNodes) {
      showToast({
        type: 'warning',
        title: 'Nothing to organize',
        message: 'Add some nodes before organizing.',
      })
      return
    }

    setIsTidying(true)
    try {
      const nodeMap: NodeMap = {}
      nodes.forEach((node, id) => {
        nodeMap[id] = node
      })

      const edgeMap: EdgeMap = {}
      edges.forEach((edge, id) => {
        edgeMap[id] = edge
      })

      const positions = autoLayout(nodeMap, edgeMap)
      if (!positions.length) {
        showToast({
          type: 'warning',
          title: 'Nothing to organize',
          message: 'Add some nodes before organizing.',
        })
        return
      }

      const currentPositions = Array.from(nodes.values()).map((node) => node.position)
      const currentMinX = Math.min(...currentPositions.map((pos) => pos.x))
      const currentMinY = Math.min(...currentPositions.map((pos) => pos.y))
      const layoutMinX = Math.min(...positions.map((pos) => pos.x))
      const layoutMinY = Math.min(...positions.map((pos) => pos.y))
      const offsetX = currentMinX - layoutMinX
      const offsetY = currentMinY - layoutMinY

      positions.forEach(({ id, x, y }) => {
        const position = { x: x + offsetX, y: y + offsetY }
        updateNode(id, { position })
        window.dispatchEvent(
          new CustomEvent('node:ws-update', {
            detail: { nodeId: id, data: { position } },
          })
        )
        void updateNodeApi(id, { position }).catch((error) => {
          console.error('Failed to persist position', error)
        })
      })

      showToast({
        type: 'success',
        title: 'Nodes organized',
        message: 'The view has been reorganized.',
      })
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Unable to reorganize the nodes.',
      })
    } finally {
      setIsTidying(false)
    }
  }, [edges, hasNodes, nodes, showToast, updateNode])

  const shareTitle = currentProjectId
    ? 'Copy share link'
    : 'Open a project to share'
  const tidyTitle = hasNodes ? 'Organize nodes' : 'Add nodes to organize'

  return (
    <>
      <UiSidebar
        isOpen={isOpen}
        onClose={toggle}
        onToggle={toggle}
        title={
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              forky
            </span>
            <button
              type="button"
              onClick={handleCopyShare}
              className="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={shareTitle}
              aria-label={shareTitle}
              disabled={!currentProjectId || isCopying}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleAutoLayout}
              className="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={tidyTitle}
              aria-label={tidyTitle}
              disabled={!hasNodes || isTidying}
            >
              <Brush className="h-4 w-4" />
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <NewProjectButton />
          <NewNodeButton />
        </div>

        <div className="px-4 pb-4">
          <SystemPromptEditor />
        </div>

        <div className="px-4 pb-4">
          <QuickActionsList />
        </div>

        <div className="px-4 pb-4">
          <ProjectList />
        </div>
      </UiSidebar>

      {activeModal === 'quick-action' && <QuickActionModal />}
    </>
  )
}
