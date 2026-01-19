'use client'

import { Plus } from 'lucide-react'
import { useStore, useViewport } from '@/lib/store'

export function NewNodeButton() {
  const addNode = useStore((s) => s.addNode)
  const viewport = useViewport()

  const handleClick = () => {
    const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom
    const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom

    const nodeId = addNode({ x: centerX, y: centerY })
    window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId } }))
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500
                 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors
                 active:scale-95"
    >
      <Plus className="w-5 h-5" />
      Nouvelle Instruction
    </button>
  )
}
