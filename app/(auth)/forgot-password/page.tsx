'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'
import AuthBrand from '@/components/auth/AuthBrand'

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
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-3 rounded-2xl border-2 border-[var(--ink)] bg-white p-6 text-center sm:p-10" style={{ boxShadow: '6px 6px 0 var(--ink)' }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--red)' }}>
            <Check className="h-7 w-7 text-white" />
          </div>
          <h1 className="bq-display text-2xl text-[var(--ink)]">Check your email</h1>
          <p className="text-sm leading-relaxed text-black/55">
            If an account exists for{' '}
            <span className="font-semibold text-[var(--ink)]">{email}</span>, we sent a
            link to reset your password.
          </p>
          <Link
            href="/login"
            className="inline-block pt-2 text-sm font-semibold text-[var(--red)] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border-2 border-[var(--ink)] bg-white p-6 sm:p-10" style={{ boxShadow: '6px 6px 0 var(--ink)' }}>

        <AuthBrand />

        <div>
          <h1 className="bq-display text-3xl text-[var(--ink)]">Reset your password</h1>
          <p className="mt-1 text-sm text-black/55">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-[var(--ink)]">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg border border-[var(--ink)]/20 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-[var(--red)]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--red)' }}
          >
            {loading ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm text-black/55">
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-[var(--red)] hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
