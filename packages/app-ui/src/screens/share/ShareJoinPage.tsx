'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { guestJoinApi } from '@forky/state'

export function ShareJoinPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = typeof params.token === 'string' ? params.token : ''
  const [runError, setRunError] = useState<string | null>(null)

  const derivedError = useMemo(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      return errorParam === 'invalid_token'
        ? 'Invalid link'
        : 'Unable to join this project'
    }
    if (!token) {
      return 'Lien invalide'
    }
    return null
  }, [searchParams, token])

  useEffect(() => {
    if (derivedError) return

    const run = async () => {
      try {
        if (token) {
          try {
            sessionStorage.setItem('shareToken', token)
          } catch {
            // Ignore storage errors (private mode, blocked storage, etc.).
          }
        }
        const data = await guestJoinApi(token)
        if (data?.projectId) {
          window.location.assign(`/projects/${data.projectId}`)
        } else {
          setRunError('Unable to join this project')
        }
      } catch {
        setRunError('Unable to join this project')
      }
    }

    void run()
  }, [derivedError, token])

  const error = derivedError ?? runError

  if (error) {
    return <div>{error}</div>
  }

  return <div>Loading...</div>
}
