'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import { Handle, Position, type NodeProps, type Node as FlowNode } from '@xyflow/react'
import { Play, RefreshCw, X, AlertTriangle, Maximize, GitBranch, Hammer, ChevronDown, ChevronRight, MessageSquare, Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useBuildActions } from '@/lib/store'
import { NodePrompt } from './NodePrompt'
import { NodeResponse } from './NodeResponse'
import type { Node } from '@forky/shared'
import { cn } from '@forky/shared'

type CustomNodeType = FlowNode<{ node: Node; branchColor?: string }, 'custom'>
type CustomNodeProps = NodeProps<CustomNodeType>

function CustomNodeComponent({ id, data, selected }: CustomNodeProps) {
  const { node, branchColor } = data
  const setFocusModeNodeId = useStore((s) => s.setFocusModeNodeId)
  const updateNodePrompt = useStore((s) => s.updateNodePrompt)
  const deleteNode = useStore((s) => s.deleteNode)
  const promptFocusNodeId = useStore((s) => s.promptFocusNodeId)
  const setPromptFocusNodeId = useStore((s) => s.setPromptFocusNodeId)
  const { startBuildFromNode } = useBuildActions()
  const [isPromptExpanded, setIsPromptExpanded] = useState(false)
  const [isResponseExpanded, setIsResponseExpanded] = useState(false)
  const [shouldAutoFocusPrompt, setShouldAutoFocusPrompt] = useState(false)

  useEffect(() => {
    if (promptFocusNodeId !== id) return
    setIsPromptExpanded(true)
    setShouldAutoFocusPrompt(true)
  }, [promptFocusNodeId, id])

  const handlePromptAutoFocusDone = useCallback(() => {
    if (promptFocusNodeId === id) {
      setPromptFocusNodeId(null)
    }
    setShouldAutoFocusPrompt(false)
  }, [promptFocusNodeId, id, setPromptFocusNodeId])

  const isLoading = node.status === 'loading'
  const isError = node.status === 'error'
  const isStale = node.status === 'stale'
  const canGenerate = node.prompt.trim().length > 0 && !isLoading
  const canCascade = node.childrenIds?.length > 0 && !isLoading

  const getTitle = () => {
    if (node.summary && node.summary.trim()) {
      return node.summary.trim()
    }
    if (node.prompt && node.prompt.trim()) {
      const firstLine = node.prompt.split('\n')[0].trim()
      return firstLine.slice(0, 60) + (firstLine.length > 60 ? '...' : '')
    }
    return 'Nouveau node'
  }

  const handlePromptChange = useCallback(
    (value: string) => {
      updateNodePrompt(id, value)
      window.dispatchEvent(
        new CustomEvent('node:ws-update', { detail: { nodeId: id, data: { prompt: value } } })
      )
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
    window.dispatchEvent(new CustomEvent('node:ws-delete', { detail: { nodeId: id } }))
  }, [id, deleteNode])

  const handleFocusMode = useCallback(() => {
    setFocusModeNodeId(id)
  }, [id])

  const handleBuild = useCallback(() => {
    startBuildFromNode(id)
  }, [id])

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

  const title = getTitle()

  return (
    <div
      className={cn(
        'w-[400px] rounded-xl overflow-hidden',
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

      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {branchColor && (
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: branchColor }}
                />
              )}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                {title}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {isLoading && (
                <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Génération...
                </span>
              )}
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
              {!isLoading && !isStale && !isError && node.prompt && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-3 h-3" />
                  {node.prompt.length > 0 ? 'Prêt' : 'Vide'}
                </span>
              )}
              {node.response && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-3 h-3" />
                  Réponse
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={handleFocusMode}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
              title="Mode focus (voir tout le contenu)"
            >
              <Maximize className="w-4 h-4" />
            </button>
            {canGenerate && (
              <button
                onClick={handleGenerate}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                title="Générer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
              title="Supprimer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-2">
          <button
            onClick={() => setIsPromptExpanded(!isPromptExpanded)}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {isPromptExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>Prompt {node.prompt ? `(${node.prompt.length} car.)` : '(vide)'}</span>
          </button>

          {isPromptExpanded && (
            <div className="mt-2">
              <NodePrompt
                value={node.prompt}
                onChange={handlePromptChange}
                onGenerate={handleGenerate}
                disabled={isLoading}
                autoFocus={shouldAutoFocusPrompt}
                onAutoFocusDone={handlePromptAutoFocusDone}
              />
            </div>
          )}
        </div>
      </div>

      {node.response && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsResponseExpanded(!isResponseExpanded)}
            className="w-full flex items-start justify-between gap-2 group"
          >
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Réponse</span>
              </div>
              {node.summary ? (
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                  {node.summary}
                </p>
              ) : (
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                  {node.response.slice(0, 150)}...
                </p>
              )}
            </div>
            <ChevronRight
              className={cn(
                'w-4 h-4 text-gray-400 mt-1 shrink-0 transition-transform',
                isResponseExpanded && 'rotate-90'
              )}
            />
          </button>

          {isResponseExpanded && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <NodeResponse
                content={node.response || ''}
                summary={node.summary}
                isLoading={isLoading}
                error={node.metadata?.customData?.error}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleBuild}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Démarrer un build"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Build</span>
          </button>
          {canCascade && (
            <button
              onClick={handleCascadeRegenerate}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
              title="Régénérer en cascade"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cascade</span>
            </button>
          )}
        </div>
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
