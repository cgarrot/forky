'use client'

import type { QuickAction } from '@forky/shared-core'
import { useStore } from '@forky/state'

export function useQuickActions() {
  const quickActions = useStore((s) => s.quickActions)
  const addQuickAction = useStore((s) => s.addQuickAction)
  const updateQuickAction = useStore((s) => s.updateQuickAction)
  const deleteQuickAction = useStore((s) => s.deleteQuickAction)
  const reorderQuickActions = useStore((s) => s.reorderQuickActions)

  const upsertQuickAction = (next: { id?: string; label: string; instruction: string }) => {
    if (next.id) {
      updateQuickAction(next.id, { label: next.label, instruction: next.instruction })
      return
    }

    addQuickAction(next.label, next.instruction)
  }

  const sortedQuickActions = [...quickActions].sort((a, b) => a.order - b.order)

  return {
    quickActions: sortedQuickActions,
    upsertQuickAction,
    updateQuickAction,
    deleteQuickAction,
    reorderQuickActions: (qas: QuickAction[]) => reorderQuickActions(qas),
  }
}
