'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, X, ChevronDown, ChevronUp, Zap, FileText } from 'lucide-react'
import { cn } from '@forky/shared'
import type { QuickAction } from '@forky/shared'

interface DirectPromptInputProps {
  position: { x: number; y: number }
  sourceNodeId?: string | null
  quickActions: QuickAction[]
  onSubmit: (prompt: string) => void
  onSubmitDraft: (prompt: string) => void
  onCancel: () => void
  onQuickActionSelect?: (action: QuickAction) => void
}

export function DirectPromptInput({
  position,
  sourceNodeId,
  quickActions,
  onSubmit,
  onSubmitDraft,
  onCancel,
  onQuickActionSelect,
}: DirectPromptInputProps) {
  const [prompt, setPrompt] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [smartPosition, setSmartPosition] = useState(position)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const { width, height } = rect

      const estimatedHeight = showQuickActions ? height + (quickActions.length * 60) : height
      const adjustedPosition = calculateSmartPosition(
        position.x,
        position.y,
        width,
        estimatedHeight,
        20
      )

      setSmartPosition(adjustedPosition)
    }
  }, [position.x, position.y, showQuickActions, quickActions.length])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !showQuickActions) {
        e.preventDefault()
        const currentPrompt = (e.target as HTMLTextAreaElement).value
        if (currentPrompt.trim()) {
          onSubmit(currentPrompt.trim())
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSubmit, onCancel, showQuickActions])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.direct-prompt-input')) {
        setTimeout(() => {
          onCancel()
        }, 100)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCancel])

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt.trim())
    }
  }

  const handleQuickActionClick = (action: QuickAction) => {
    if (onQuickActionSelect) {
      onQuickActionSelect(action)
    } else {
      onSubmit(action.instruction)
    }
  }

  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions)
  }

  return (
    <div
      className="fixed z-[1002] direct-prompt-input"
      style={{ left: smartPosition.x, top: smartPosition.y }}
      onClick={(e) => {
        e.stopPropagation()
      }}
      ref={containerRef}
    >
      <div className="w-[400px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-blue-500 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {sourceNodeId ? 'Nœud enfant' : 'Nouveau nœud'}
          </span>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Annuler (Échap)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Écrivez votre prompt ici... (Entrée pour générer, Échap pour annuler)"
            className="w-full h-24 p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>

        {quickActions.length > 0 && (
          <div className="px-3 pb-3">
            <button
              onClick={toggleQuickActions}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 transition-colors text-xs font-medium"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Actions rapides</span>
              {showQuickActions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {showQuickActions && quickActions.length > 0 && (
          <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              {quickActions.slice(0, 5).map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickActionClick(action)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left group"
                >
                  <div className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-700 group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition-colors flex-shrink-0">
                    <Zap className="w-3 h-3 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                      {action.instruction}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Entrée pour générer • Échap pour annuler
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (prompt.trim()) {
                  onSubmitDraft(prompt.trim())
                }
              }}
              disabled={!prompt.trim()}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                prompt.trim()
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
              title="Créer en brouillon (sans générer)"
            >
              <FileText className="w-3.5 h-3.5" />
              Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                prompt.trim()
                  ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
              title="Générer (Entrée)"
            >
              <Send className="w-3.5 h-3.5" />
              Générer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function calculateSmartPosition(
  initialX: number,
  initialY: number,
  elementWidth: number,
  elementHeight: number,
  padding: number = 20
): { x: number; y: number } {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080

  let adjustedX = initialX

  if (initialX + elementWidth + padding > viewportWidth) {
    adjustedX = initialX - elementWidth - padding
    if (adjustedX < padding) {
      adjustedX = viewportWidth - elementWidth - padding
    }
  }

  if (adjustedX < padding) {
    adjustedX = padding
  }

  let adjustedY = initialY

  if (initialY + elementHeight + padding > viewportHeight) {
    adjustedY = initialY - elementHeight - padding
    if (adjustedY < padding) {
      adjustedY = viewportHeight - elementHeight - padding
    }
  }

  if (adjustedY < padding) {
    adjustedY = padding
  }

  return { x: adjustedX, y: adjustedY }
}
