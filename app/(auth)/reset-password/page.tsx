'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-10 w-full max-w-md space-y-6">

        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-zinc-900 tracking-tight">BarberPro</span>
        </div>

        {status === 'checking' && (
          <p className="text-sm text-zinc-400">Loading...</p>
        )}

        {status === 'invalid' && (
          <div className="space-y-3">
            <h1 className="text-xl font-bold text-zinc-900">Link expired</h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              This password reset link is invalid or has expired. Request a new one
              to continue.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block text-sm text-zinc-700 font-semibold hover:underline"
            >
              Request a new link
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Set a new password</h1>
              <p className="text-zinc-500 text-sm mt-1">
                Choose a new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="text-sm font-medium text-zinc-700">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-bold py-2.5 rounded-lg transition-colors text-sm"
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
