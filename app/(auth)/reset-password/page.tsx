'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthBrand from '@/components/auth/AuthBrand'

type Status = 'checking' | 'ready' | 'invalid'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // The auth callback already exchanged the recovery code into a session.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? 'ready' : 'invalid')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/login?reset=1')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border-2 border-[var(--ink)] bg-white p-6 sm:p-10" style={{ boxShadow: '6px 6px 0 var(--ink)' }}>

        <AuthBrand />

        {status === 'checking' && (
          <p className="text-sm text-black/45">Loading...</p>
        )}

        {status === 'invalid' && (
          <div className="space-y-3">
            <h1 className="bq-display text-2xl text-[var(--ink)]">Link expired</h1>
            <p className="text-sm leading-relaxed text-black/55">
              This password reset link is invalid or has expired. Request a new one
              to continue.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block text-sm font-semibold text-[var(--red)] hover:underline"
            >
              Request a new link
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div>
              <h1 className="bq-display text-3xl text-[var(--ink)]">Set a new password</h1>
              <p className="mt-1 text-sm text-black/55">
                Choose a new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-[var(--ink)]">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[var(--ink)]/20 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-[var(--red)]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="text-sm font-semibold text-[var(--ink)]">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[var(--ink)]/20 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-[var(--red)]"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'var(--red)' }}
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
