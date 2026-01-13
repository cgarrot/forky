'use client'

import { useCallback } from 'react'
import { Settings } from 'lucide-react'
import { cn } from '@forky/shared'
import { useSettings, useStore } from '@/lib/store'

export function SystemPromptEditor() {
  const settings = useSettings()
  const updateSettings = useStore((s) => s.updateSettings)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateSettings({ systemPrompt: e.target.value })
    },
    [updateSettings]
  )

  return (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
        <Settings className="w-3 h-3" />
        Instructions Globales
      </h3>
      <textarea
        defaultValue={settings.systemPrompt}
        onChange={handleChange}
        placeholder="Entrez les instructions globales qui seront envoyées à chaque requête..."
        className={cn(
          "w-full h-24 p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
        )}
      />
    </div>
  )
}
