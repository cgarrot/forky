'use client'

import { useEffect } from 'react'
import { AppLayout, Button } from '@forky/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App route error:', error)
  }, [error])

  return (
    <AppLayout>
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">An error occurred.</div>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </AppLayout>
  )
}
