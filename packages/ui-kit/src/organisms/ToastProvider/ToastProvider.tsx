'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { generateId } from '@forky/shared-core'
import { ToastContainer } from '../ToastContainer'
import type { ToastVariant } from '../ToastContainer'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  showToast: (toast: Toast) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<
    Array<{ id: string; variant: ToastVariant; message: string; duration?: number }>
  >([])

  const showToast = useCallback((toast: Toast) => {
    const id = generateId()
    const message = toast.message ? `${toast.title}: ${toast.message}` : toast.title
    const duration = toast.duration ?? 5000
    const newToast = { id, variant: toast.type as ToastVariant, message, duration }
    setToasts((prev) => [...prev, newToast])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={dismissToast} />
    </ToastContext.Provider>
  )
}
