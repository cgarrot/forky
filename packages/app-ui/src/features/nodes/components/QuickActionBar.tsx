'use client'

import { useStore } from '@forky/state'
import { cn } from '@forky/shared-ui'
import type { QuickAction } from '@forky/shared-core'

interface QuickActionBarProps {
  onAction: (action: QuickAction) => void
  disabled?: boolean
}

export function QuickActionBar({ onAction, disabled }: QuickActionBarProps) {
  const quickActions = useStore((s) => s.quickActions)

  const handleAction = (action: QuickAction) => {
    if (disabled) {
      return
    }
    onAction(action)
  }

  if (quickActions.length === 0) {
    return null
  }

  return (
    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Quick actions:
      </p>
      <div className="flex flex-wrap gap-2">
        {[...quickActions]
          .sort((a, b) => a.order - b.order)
          .map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={disabled}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:scale-105 active:scale-95 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400',
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              )}
              title={action.instruction}
            >
              {action.label}
            </button>
          ))}
      </div>
    </div>
  )
}
