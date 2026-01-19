'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <p>An error occurred.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  )
}
