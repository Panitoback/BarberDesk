'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Mode = 'magic' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function getBaseOrigin(): string {
    const { protocol, hostname, port } = window.location
    const portSuffix = port ? `:${port}` : ''
    if (hostname.includes('localhost')) {
      return `${protocol}//localhost${portSuffix}`
    }
    const parts = hostname.split('.')
    const base = parts.length > 2 ? parts.slice(1).join('.') : hostname
    return `${protocol}//${base}${portSuffix}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      router.refresh()
      router.push('/dashboard')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${getBaseOrigin()}/auth/callback` },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 w-full max-w-md text-center space-y-3">
          <div className="text-4xl">✉️</div>
          <h1 className="text-xl font-semibold text-zinc-900">Check your email</h1>
          <p className="text-zinc-500 text-sm">
            We sent a link to <span className="font-medium text-zinc-800">{email}</span>.
            Click the link to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900">Sign in to BarberPro</h1>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-zinc-200 p-1 gap-1">
          <button
            type="button"
            onClick={() => { setMode('password'); setError(null) }}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
              mode === 'password'
                ? 'bg-zinc-900 text-white font-medium'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode('magic'); setError(null) }}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
              mode === 'magic'
                ? 'bg-zinc-900 text-white font-medium'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Magic link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {mode === 'password' && (
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? 'Loading...'
              : mode === 'password' ? 'Sign in' : 'Send access link'}
          </Button>
        </form>
      </div>
    </div>
  )
}
