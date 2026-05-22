'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Scissors, Check } from 'lucide-react'

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getBaseOrigin()}/auth/callback?next=/reset-password`,
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-10 w-full max-w-md text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Check your email</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            If an account exists for{' '}
            <span className="font-semibold text-zinc-800">{email}</span>, we sent a
            link to reset your password.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm text-zinc-700 font-semibold hover:underline pt-2"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-10 w-full max-w-md space-y-6">

        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-zinc-900 tracking-tight">BarberPro</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Reset your password</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
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
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-bold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Remembered it?{' '}
          <Link href="/login" className="text-zinc-700 font-semibold hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
