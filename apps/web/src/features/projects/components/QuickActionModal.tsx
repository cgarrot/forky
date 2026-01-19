'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Modal, Textarea } from '@forky/ui'
import { useStore } from '@/lib/store'

export function QuickActionModal() {
  const activeQuickActionId = useStore((s) => s.ui.activeQuickActionId)
  const quickActions = useStore((s) => s.quickActions)
  const activeModal = useStore((s) => s.ui.activeModal)

  const action = activeQuickActionId
    ? quickActions.find((qa) => qa.id === activeQuickActionId) || null
    : null

  const [label, setLabel] = useState('')
  const [instruction, setInstruction] = useState('')
  const addQuickAction = useStore((s) => s.addQuickAction)
  const updateQuickAction = useStore((s) => s.updateQuickAction)
  const setActiveModal = useStore((s) => s.setActiveModal)
  const setActiveQuickActionId = useStore((s) => s.setActiveQuickActionId)

  const isOpen = activeModal === 'quick-action'

  useEffect(() => {
    if (isOpen) {
      setLabel(action?.label || '')
      setInstruction(action?.instruction || '')
    } else {
      setLabel('')
      setInstruction('')
    }
  }, [isOpen, action])

  const handleClose = () => {
    setActiveModal(null)
    setActiveQuickActionId(null)
  }

  const isValid = label.trim().length > 0 && instruction.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    if (action) {
      updateQuickAction(action.id, { label: label.trim(), instruction: instruction.trim() })
    } else {
      addQuickAction(label.trim(), instruction.trim())
    }
    handleClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={action ? "Edit action" : 'New quick action'}
      size="md"
    >
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
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid}>
            {action ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
