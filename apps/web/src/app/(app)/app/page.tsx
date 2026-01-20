'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout, Spinner } from '@forky/ui'
import { getLastProjectId } from '@forky/state'

export default function AppPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const lastProjectId = await getLastProjectId()
      if (cancelled) return
      router.replace(lastProjectId ? `/projects/${lastProjectId}` : '/projects')
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <AppLayout>
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    </AppLayout>
  )
}
