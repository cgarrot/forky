'use client'

import { useEffect, useRef, useState } from 'react'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import { cn } from '@forky/shared'

type SaveIndicatorStatus = 'idle' | 'saving' | 'saved' | 'error'

export function SaveIndicator() {
  const [status, setStatus] = useState<SaveIndicatorStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const clearResetTimer = () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
    }

    const handleSaving = () => {
      clearResetTimer()
      setStatus('saving')
    }

    const handleSaved = (event: Event) => {
      clearResetTimer()
      setStatus('saved')

      const customEvent = event as CustomEvent<{ savedAt?: string }>
      const savedAt = customEvent.detail?.savedAt
      setLastSaved(savedAt ? new Date(savedAt) : new Date())

      resetTimerRef.current = setTimeout(() => {
        setStatus('idle')
      }, 2000)
    }

    const handleError = () => {
      clearResetTimer()
      setStatus('error')
      resetTimerRef.current = setTimeout(() => {
        setStatus('idle')
      }, 3000)
    }

    window.addEventListener('project:saving', handleSaving)
    window.addEventListener('project:saved', handleSaved)
    window.addEventListener('storage_error', handleError)

    return () => {
      clearResetTimer()
      window.removeEventListener('project:saving', handleSaving)
      window.removeEventListener('project:saved', handleSaved)
      window.removeEventListener('storage_error', handleError)
    }
  }, [])

  const formatTime = (date: Date | null) => {
    if (!date) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)

    if (seconds < 60) return "À l'instant"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Il y a ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Il y a ${hours}h`
    return date.toLocaleDateString('fr-FR')
  }

  const statusConfig = {
    idle: {
      icon: CloudOff,
      className: 'text-gray-400',
      text: lastSaved ? formatTime(lastSaved) : 'Non sauvegardé',
    },
    saving: {
      icon: Loader2,
      className: 'text-blue-500 animate-spin',
      text: 'Sauvegarde...',
    },
    saved: {
      icon: Cloud,
      className: 'text-green-500',
      text: lastSaved ? `Sauvegardé (${formatTime(lastSaved)})` : 'Sauvegardé',
    },
    error: {
      icon: CloudOff,
      className: 'text-red-500',
      text: 'Erreur de sauvegarde',
    },
  }

  const { Icon, className, text } = {
    ...statusConfig[status],
    Icon: statusConfig[status].icon,
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'bg-gray-100 dark:bg-gray-800',
        'text-sm font-medium transition-all duration-200'
      )}
    >
      <Icon className={cn('w-4 h-4', className)} />
      <span className="text-gray-600 dark:text-gray-400">{text}</span>
    </div>
  )
}
