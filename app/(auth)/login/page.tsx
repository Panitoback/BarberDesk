'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthBrand from '@/components/auth/AuthBrand'

type Mode = 'magic' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // Surface the success banner after a completed password reset
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reset') === '1') {
      setResetDone(true)
    }
  }, [])

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

  function tenantOrigin(subdomain: string): string {
    return getBaseOrigin().replace('://', `://${subdomain}.`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'password') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user) {
        setError(error?.message ?? 'Sign in failed')
        setLoading(false)
        return
      }

      // `?next=/path` — stay on the base domain and go to that path. Used by
      // /admin (admin users typically don't own a tenant, so the default
      // tenant-redirect would push them to /register).
      const next = new URLSearchParams(window.location.search).get('next')
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        window.location.href = next
        return
      }

      // Send the owner to their shop's subdomain dashboard
      // Use limit(1) instead of maybeSingle() — maybeSingle() silently returns null
      // when the user owns multiple tenants, causing a false redirect to /register.
      const { data: tenants } = await supabase
        .from('tenants')
        .select('subdomain')
        .eq('owner_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const tenant = tenants?.[0]
      if (tenant?.subdomain) {
        window.location.href = `${tenantOrigin(tenant.subdomain)}/`
      } else {
        router.push('/register')
      }
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
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-3 rounded-2xl border-2 border-[var(--ink)] bg-white p-6 text-center sm:p-10" style={{ boxShadow: '6px 6px 0 var(--ink)' }}>
          <div className="text-4xl">✉️</div>
          <h1 className="bq-display text-2xl text-[var(--ink)]">Check your email</h1>
          <p className="text-sm text-black/55">
            We sent a link to <span className="font-semibold text-[var(--ink)]">{email}</span>.
            Click the link to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border-2 border-[var(--ink)] bg-white p-6 sm:p-10" style={{ boxShadow: '6px 6px 0 var(--ink)' }}>
        <AuthBrand />
        <div className="space-y-1">
          <h1 className="bq-display text-3xl text-[var(--ink)]">Sign in</h1>
        </div>

        {resetDone && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Your password has been updated. Sign in with your new password.
          </p>
        )}

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg border-2 border-[var(--ink)]/15 p-1">
          <button
            type="button"
            onClick={() => { setMode('password'); setError(null) }}
            className={`flex-1 rounded-md py-1.5 text-sm transition-colors ${
              mode === 'password'
                ? 'bg-[var(--ink)] font-semibold text-white'
                : 'text-black/50 hover:text-[var(--ink)]'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode('magic'); setError(null) }}
            className={`flex-1 rounded-md py-1.5 text-sm transition-colors ${
              mode === 'magic'
                ? 'bg-[var(--ink)] font-semibold text-white'
                : 'text-black/50 hover:text-[var(--ink)]'
            }`}
          >
            Magic link
          </button>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg border border-[var(--ink)]/20 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-[var(--red)]"
            />
          </div>

          {mode === 'password' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-[var(--ink)]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[var(--red)] transition-colors hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[var(--ink)]/20 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-[var(--red)]"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--red)' }}
          >
            {loading
              ? 'Loading...'
              : mode === 'password' ? 'Sign in' : 'Send access link'}
          </button>
        </form>
      </div>
    </div>
  )
}
