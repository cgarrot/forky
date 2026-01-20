'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react'
import { useStore } from '@forky/state'
import { cn } from '@forky/shared-ui'

export function QuickActionsList() {
  const quickActions = useStore((s) => s.quickActions)
  const deleteQuickAction = useStore((s) => s.deleteQuickAction)
  const setActiveModal = useStore((s) => s.setActiveModal)
  const setActiveQuickActionId = useStore((s) => s.setActiveQuickActionId)

  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleCreate = () => {
    setActiveQuickActionId(null)
    setActiveModal('quick-action')
  }

  const handleEdit = (id: string) => {
    setActiveQuickActionId(id)
    setActiveModal('quick-action')
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette action rapide ?')) {
      return
    }
    deleteQuickAction(id)
  }

  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetId: string) => {
    if (draggedId === targetId || !draggedId) return

    const actions = [...quickActions]
    const draggedIndex = actions.findIndex((a) => a.id === draggedId)
    const targetIndex = actions.findIndex((a) => a.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const [dragged] = actions.splice(draggedIndex, 1)
    actions.splice(targetIndex, 0, dragged)

    const reorderedActions = actions.map((action, index) => ({
      ...action,
      order: index,
    }))

    const reorderQuickActions = useStore.getState().reorderQuickActions
    reorderQuickActions(reorderedActions)

    setDraggedId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  if (quickActions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            ⚡ Quick Actions
          </h3>
          <button
            onClick={handleCreate}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
          No quick actions
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ⚡ Quick Actions ({quickActions.length})
        </h3>
        <button
          onClick={handleCreate}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {[...quickActions]
          .sort((a, b) => a.order - b.order)
          .map((action) => (
            <div
              key={action.id}
              draggable
              onDragStart={() => handleDragStart(action.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(action.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                'bg-gray-50 dark:bg-gray-800',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors cursor-move',
                'group'
              )}
            >
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {action.instruction}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(action.id)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(action.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
