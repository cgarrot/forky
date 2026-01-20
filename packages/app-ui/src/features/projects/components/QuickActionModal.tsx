'use client'

import { useState } from 'react'
import { Button, Input, Modal, Textarea } from '@forky/ui'
import { useStore } from '@forky/state'
import type { QuickAction } from '@forky/shared-core'

type QuickActionFormProps = {
  action: QuickAction | null
  onClose: () => void
  addQuickAction: (label: string, instruction: string) => void
  updateQuickAction: (id: string, updates: Partial<QuickAction>) => void
}

function QuickActionForm({
  action,
  onClose,
  addQuickAction,
  updateQuickAction,
}: QuickActionFormProps) {
  const [label, setLabel] = useState(action?.label ?? '')
  const [instruction, setInstruction] = useState(action?.instruction ?? '')

  const isValid = label.trim().length > 0 && instruction.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    if (action) {
      updateQuickAction(action.id, { label: label.trim(), instruction: instruction.trim() })
    } else {
      addQuickAction(label.trim(), instruction.trim())
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="quick-action-label"
        label="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Ex: Summarize"
      />

      <Textarea
        id="quick-action-instruction"
        label="Instruction"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="Ex: Summarize this content in a few key points..."
        rows={4}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid}>
          {action ? 'Save' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

export function QuickActionModal() {
  const activeQuickActionId = useStore((s) => s.ui.activeQuickActionId)
  const quickActions = useStore((s) => s.quickActions)
  const activeModal = useStore((s) => s.ui.activeModal)

  const action = activeQuickActionId
    ? quickActions.find((qa) => qa.id === activeQuickActionId) || null
    : null

  const addQuickAction = useStore((s) => s.addQuickAction)
  const updateQuickAction = useStore((s) => s.updateQuickAction)
  const setActiveModal = useStore((s) => s.setActiveModal)
  const setActiveQuickActionId = useStore((s) => s.setActiveQuickActionId)

  const isOpen = activeModal === 'quick-action'

  const handleClose = () => {
    setActiveModal(null)
    setActiveQuickActionId(null)
  }

  const formKey = `${activeQuickActionId ?? 'new'}:${isOpen ? 'open' : 'closed'}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={action ? 'Edit action' : 'New quick action'}
      size="md"
    >
      {isOpen && (
        <QuickActionForm
          key={formKey}
          action={action}
          onClose={handleClose}
          addQuickAction={addQuickAction}
          updateQuickAction={updateQuickAction}
        />
      )}
    </Modal>
  )
}
