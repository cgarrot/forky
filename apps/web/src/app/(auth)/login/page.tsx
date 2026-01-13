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
        setError(data.error || 'Échec de la connexion')
        return
      }

      showToast({
        type: 'success',
        title: 'Connexion réussie',
        message: 'Bienvenue sur Forky',
      })

      const redirectTo = searchParams.get('next') || '/projects'
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Une erreur est survenue lors de la connexion')
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
        setGuestError(data.error || 'Échec du démarrage du mode invité')
        showToast({
          type: 'error',
          title: 'Erreur',
          message: data.error || 'Échec du démarrage du mode invité',
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
             title: 'Mode invité activé',
             message: 'Lien de partage copié dans le presse-papier',
           })
         } catch {
           showToast({
             type: 'success',
             title: 'Mode invité activé',
             message: 'Redirection vers votre espace',
           })
         }
       } else {
         showToast({
           type: 'success',
           title: 'Mode invité activé',
           message: 'Redirection vers votre espace',
         })
       }

       router.push(`/projects/${data.projectId}`)
       router.refresh()
    } catch {
      setGuestError('Une erreur est survenue lors du démarrage du mode invité')
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Une erreur est survenue lors du démarrage du mode invité',
      })
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Connexion
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Accédez à votre espace d&apos;exploration d&apos;idées
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
            Mot de passe
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
          Se connecter
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pas encore de compte ?{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Créer un compte
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
          Mode invité
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

