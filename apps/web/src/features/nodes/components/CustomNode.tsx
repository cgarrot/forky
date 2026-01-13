'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps, type Node as FlowNode } from '@xyflow/react'
import { Play, RefreshCw, X, AlertTriangle, Maximize, GitBranch } from 'lucide-react'
import { useStore } from '@/lib/store'
import { NodePrompt } from './NodePrompt'
import { NodeResponse } from './NodeResponse'
import { QuickActionBar } from './QuickActionBar'
import type { Node, QuickAction } from '@forky/shared'
import { cn } from '@forky/shared'

type CustomNodeType = FlowNode<{ node: Node }, 'custom'>
type CustomNodeProps = NodeProps<CustomNodeType>


function CustomNodeComponent({ id, data, selected }: CustomNodeProps) {
  const { node } = data
  const setFocusModeNodeId = useStore((s) => s.setFocusModeNodeId)
  const updateNodePrompt = useStore((s) => s.updateNodePrompt)
  const deleteNode = useStore((s) => s.deleteNode)
  const addNode = useStore((s) => s.addNode)
  const addEdge = useStore((s) => s.addEdge)


  const isLoading = node.status === 'loading'
  const isError = node.status === 'error'
  const isStale = node.status === 'stale'
  const canGenerate = node.prompt.trim().length > 0 && !isLoading
  const canCascade = node.childrenIds?.length > 0 && !isLoading

  const handlePromptChange = useCallback(
    (value: string) => {
      updateNodePrompt(id, value)
    },
    [id, updateNodePrompt]
  )

  const handleGenerate = useCallback(() => {
    const event = new CustomEvent('node:generate', { detail: { nodeId: id } })
    window.dispatchEvent(event)
  }, [id])

  const handleCascadeRegenerate = useCallback(() => {
    const event = new CustomEvent('node:cascade-regenerate', { detail: { nodeId: id } })
    window.dispatchEvent(event)
  }, [id])

  const handleDelete = useCallback(() => {
    deleteNode(id)
  }, [id, deleteNode])

  const handleFocusMode = useCallback(() => {
    setFocusModeNodeId(id)
  }, [id, setFocusModeNodeId])

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      const newNodeId = addNode({
        x: node.position.x + 50,
        y: node.position.y + 350,
      })
      addEdge(id, newNodeId)

      updateNodePrompt(newNodeId, action.instruction)
      setTimeout(() => {
        const event = new CustomEvent('node:generate', { detail: { nodeId: newNodeId } })
        window.dispatchEvent(event)
      }, 100)
    },
    [id, node.position, addNode, addEdge, updateNodePrompt]
  )

  const borderColor = cn(
    'border-2 transition-colors duration-200',
    {
      'border-blue-500 shadow-lg shadow-blue-500/20': selected,
      'border-red-500': isError,
      'border-orange-400': isStale,
      'border-gray-200 dark:border-gray-700': !selected && !isError && !isStale,
    }
  )

  const bgColor = cn(
    'bg-white dark:bg-gray-900 transition-colors duration-200',
    {
      'bg-red-50 dark:bg-red-900/10': isError,
      'bg-orange-50 dark:bg-orange-900/10': isStale,
    }
  )

  return (
    <div
      className={cn(
        'w-[400px] min-h-[200px] rounded-xl overflow-hidden',
        borderColor,
        bgColor,
        isLoading && 'animate-pulse-border'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-900"
      />

      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {isStale && (
            <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <RefreshCw className="w-3 h-3" />
              Obsolète
            </span>
          )}
          {isError && (
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3 h-3" />
              Erreur
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {node.response && (
            <button
              onClick={handleFocusMode}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="Mode focus"
            >
              <Maximize className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Supprimer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <NodePrompt
        value={node.prompt}
        onChange={handlePromptChange}
        onGenerate={handleGenerate}
        disabled={isLoading}
      />

      <NodeResponse
        content={node.response || ''}
        summary={node.summary}
        isLoading={isLoading}
        error={node.metadata?.customData?.error}
      />

      {node.response && (
        <QuickActionBar onAction={handleQuickAction} disabled={isLoading} />
      )}

      <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
        {canCascade && (
          <button
            onClick={handleCascadeRegenerate}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              isLoading
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95'
            )}
            title="Régénérer en cascade"
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Cascade</span>
          </button>
        )}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            canGenerate
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Génération...
            </>
          ) : isStale ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Régénérer
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Générer
            </>
          )}
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  )
}

export const CustomNode = memo(CustomNodeComponent)
