'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ShareJoinPage() {
  const router = useRouter()
  const params = useParams()
  const token = typeof params.token === 'string' ? params.token : ''
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch('/api/guest/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const payload = (await response.json().catch(() => null)) as { projectId?: string; error?: string } | null

        if (!response.ok || !payload?.projectId) {
          setError(payload?.error ?? 'Lien invalide')
          return
        }

        router.push(`/projects/${payload.projectId}`)
        router.refresh()
      } catch {
        setError('Impossible de rejoindre ce projet')
      }
    }

    void run()
  }, [token, router])

  if (error) {
    return <div>{error}</div>
  }

  return <div>Chargement...</div>
}
