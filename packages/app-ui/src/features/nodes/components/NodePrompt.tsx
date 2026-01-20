'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@forky/shared-ui'

interface NodePromptProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  disabled?: boolean
  autoFocus?: boolean
  onAutoFocusDone?: () => void
}

export function NodePrompt({
  value,
  onChange,
  onGenerate,
  disabled,
  autoFocus,
  onAutoFocusDone,
}: NodePromptProps) {
  const [localValue, setLocalValue] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = `${newHeight}px`
    }
  }, [localValue])

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (!autoFocus || disabled) return
    const textarea = textareaRef.current
    if (!textarea) return

    let cancelled = false

    const focus = () => {
      if (cancelled) return

      try {
        textarea.focus()
      } catch {
        // Ignore focus errors on unmounted nodes.
      }

      onAutoFocusDone?.()
    }

    const timeoutId = window.setTimeout(focus, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [autoFocus, disabled, onAutoFocusDone])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value)
    onChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (!disabled && value.trim()) {
        onGenerate()
      }
    }
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask your question here... (Ctrl+Enter to generate)"
          disabled={disabled}
          rows={1}
          className={cn(
            'w-full bg-transparent border-0 outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 pr-12 text-sm',
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          )}
          style={{ minHeight: '32px' }}
        />

        <button
          onClick={onGenerate}
          disabled={disabled || !value.trim()}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all',
            value.trim() && !disabled
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          )}
          title="Generate (Ctrl+Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {localValue.length > 0 && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-600 text-right">
          {localValue.length} character{localValue.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
