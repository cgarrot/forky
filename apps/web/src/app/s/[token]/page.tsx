'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

export default function ShareJoinPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = typeof params.token === 'string' ? params.token : ''
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        if (token) {
          try {
            sessionStorage.setItem('shareToken', token)
          } catch {
            // Ignore storage errors (private mode, blocked storage, etc.).
          }
        }
        const redirectUrl = `/api/guest/join/redirect?token=${encodeURIComponent(token)}`
        window.location.assign(redirectUrl)
      } catch {
        setError('Impossible de rejoindre ce projet')
      }
    }

    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam === 'invalid_token' ? 'Lien invalide' : 'Impossible de rejoindre ce projet')
      return
    }

    if (!token) {
      setError('Lien invalide')
      return
    }

    void run()
  }, [token, searchParams])

  if (error) {
    return <div>{error}</div>
  }

  return <div>Chargement...</div>
}
