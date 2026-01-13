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
    <html lang="fr">
      <body>
        <p>Une erreur est survenue.</p>
        <button type="button" onClick={reset}>
          Réessayer
        </button>
      </body>
    </html>
  )
}
