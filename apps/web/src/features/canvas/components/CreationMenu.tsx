'use client'

import { Plus, FileText, Zap, X } from 'lucide-react'
import type { QuickAction } from '@forky/shared'

interface CreationMenuProps {
  x: number
  y: number
  sourceNodeId?: string | null
  quickActions: QuickAction[]
  onSelectEmpty: () => void
  onSelectWithPrompt: () => void
  onSelectQuickAction: (action: QuickAction) => void
  onClose: () => void
}

export function CreationMenu({
  x,
  y,
  sourceNodeId,
  quickActions,
  onSelectEmpty,
  onSelectWithPrompt,
  onSelectQuickAction,
  onClose,
}: CreationMenuProps) {
  return (
    <div
      className="fixed z-[1001] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Créer un nœud
        </span>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2 space-y-1">
        <button
          onClick={() => {
            onSelectEmpty()
            onClose()
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
            <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Nœud vide
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Crée un nœud sans prompt
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            onSelectWithPrompt()
            onClose()
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Nœud avec prompt
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Saisir le prompt avant création
            </div>
          </div>
        </button>

        {quickActions.length > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pb-1">
              Actions rapides
            </div>
            {quickActions.slice(0, 3).map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  onSelectQuickAction(action)
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group"
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-700 group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition-colors">
                  <Zap className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {action.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    {action.instruction}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {sourceNodeId && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {quickActions.length > 3
              ? `Plus de ${quickActions.length - 3} actions disponibles`
              : 'Relié au nœud sélectionné'}
          </p>
        </div>
      )}
    </div>
  )
}
