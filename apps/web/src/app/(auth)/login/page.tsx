'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@forky/ui'
import { useToast } from '@/components/ui/Toast'
import { Mail, Lock, ArrowRight } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGuestLoading, setIsGuestLoading] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Login failed')
        return
      }

      showToast({
        type: 'success',
        title: 'Login successful',
        message: 'Welcome to forky',
      })

      const redirectTo = searchParams.get('next') || '/projects'
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestMode = async () => {
    setGuestError(null)
    setIsGuestLoading(true)

    try {
      const response = await fetch('/api/guest/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setGuestError(data.error || 'Failed to start guest mode')
        showToast({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to start guest mode',
        })
        return
      }

       const shareToken = typeof data.shareToken === 'string' && data.shareToken.length > 0 ? data.shareToken : null
       const shareUrl = shareToken ? window.location.origin + '/s/' + shareToken : null

       if (shareUrl) {
         try {
           await navigator.clipboard.writeText(shareUrl)
           showToast({
             type: 'success',
             title: 'Guest mode activated',
             message: 'Share link copied to clipboard',
           })
         } catch {
           showToast({
             type: 'success',
             title: 'Guest mode activated',
             message: 'Redirecting to your workspace',
           })
         }
       } else {
         showToast({
           type: 'success',
           title: 'Guest mode activated',
           message: 'Redirecting to your workspace',
         })
       }

       router.push(`/projects/${data.projectId}`)
       router.refresh()
    } catch {
      setGuestError('An error occurred while starting guest mode')
      showToast({
        type: 'error',
        title: 'Error',
        message: 'An error occurred while starting guest mode',
      })
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Login
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Access your idea exploration workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            icon={<Mail className="h-5 w-5 text-gray-400" />}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="h-5 w-5 text-gray-400" />}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isLoading}
          icon={!isLoading && <ArrowRight className="h-5 w-5" />}
          disabled={!email || !password}
        >
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don&apos;t have an account yet?{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>

      {guestError && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">{guestError}</p>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          fullWidth
          variant="ghost"
          size="lg"
          loading={isGuestLoading}
          onClick={handleGuestMode}
          className="text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Guest mode
        </Button>
      </div>
     </div>
   )
 }

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

