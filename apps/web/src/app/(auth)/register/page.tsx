'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@forky/ui'
import { useToast } from '@/components/ui/Toast'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Échec de l\'inscription')
        return
      }

      showToast({
        type: 'success',
        title: 'Compte créé',
        message: 'Bienvenue sur Forky',
      })

      const redirectTo = searchParams.get('next') || '/projects'
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Une erreur est survenue lors de l\'inscription')
    } finally {
      setIsLoading(false)
    }
  }

  const isPasswordValid =
    formData.password.length >= 8 &&
    /[a-z]/.test(formData.password) &&
    /[A-Z]/.test(formData.password) &&
    /\d/.test(formData.password)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Créer un compte
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Rejoignez Forky et explorez vos idées
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="vous@exemple.com"
            icon={<Mail className="h-5 w-5 text-gray-400" />}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
             Nom d&apos;utilisateur
          </label>
          <Input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="@utilisateur"
            icon={<User className="h-5 w-5 text-gray-400" />}
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Optionnel - 3 à 30 caractères
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prénom
            </label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Jean"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom
            </label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Dupont"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mot de passe
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            icon={<Lock className="h-5 w-5 text-gray-400" />}
            disabled={isLoading}
            error={formData.password && !isPasswordValid ? 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre' : undefined}
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
          disabled={!formData.email || !formData.password || !isPasswordValid}
        >
          Créer mon compte
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Déjà un compte ?{' '}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </div>
     </div>
   )
 }

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}

