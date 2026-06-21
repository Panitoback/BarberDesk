'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SLUG_RE } from '@/lib/slug'
import { Check, X, Loader2 } from 'lucide-react'
import AuthBrand from '@/components/auth/AuthBrand'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const slugHelp: Record<SlugStatus, string> = {
  idle:      '',
  checking:  'Checking availability...',
  available: '', // filled dynamically
  taken:     'That subdomain is already taken',
  invalid:   'Use lowercase letters, numbers, and hyphens (min 3 chars)',
}

const slugColor: Record<SlugStatus, string> = {
  idle:      '',
  checking:  'text-slate-400',
  available: 'text-green-600',
  taken:     'text-red-600',
  invalid:   'text-red-600',
}

const MIN_PASSWORD_LEN = 8

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const [shopName, setShopName]     = useState('')
  const [slug, setSlug]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchParams = useSearchParams()

  // Surface errors thrown by the legacy magic-link callback path
  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'slug-taken') {
      setError('That subdomain was just taken by someone else. Please choose a different one.')
    } else if (err === 'slug-invalid') {
      setError('That subdomain is not allowed. Please choose a different one.')
    }
  }, [searchParams])

  // Auto-generate slug from shop name
  useEffect(() => {
    if (!shopName) { setSlug(''); setSlugStatus('idle'); return }
    setSlug(slugify(shopName))
  }, [shopName])

  // Check slug availability (debounced)
  useEffect(() => {
    if (!slug) { setSlugStatus('idle'); return }

    if (!SLUG_RE.test(slug)) { setSlugStatus('invalid'); return }

    setSlugStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/register/check-slug?slug=${encodeURIComponent(slug)}`)
        const data = await res.json()
        setSlugStatus(data.available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 400)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [slug])

  function tenantUrl(subdomain: string): string {
    const { protocol, hostname, port } = window.location
    const portSuffix = port ? `:${port}` : ''
    const parts = hostname.split('.')
    const baseHost = parts.length > 2 ? parts.slice(1).join('.') : hostname
    return `${protocol}//${subdomain}.${baseHost}${portSuffix}/`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (slugStatus !== 'available') return
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`)
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // If the Supabase project still has "Confirm email" on, signUp returns
    // a user but no session. Surface a clear message instead of silently failing.
    if (!data.session) {
      setError(
        'Account created, but email confirmation is required by this project. ' +
        'Disable "Confirm email" in Supabase Auth settings, or sign in once you have confirmed.'
      )
      setLoading(false)
      return
    }

    const res = await fetch('/api/register/create-tenant', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ shop: shopName.trim(), slug }),
    })

    if (!res.ok) {
      const { error: apiError } = await res.json().catch(() => ({ error: 'unknown' }))
      if (apiError === 'slug_taken') {
        setError('That subdomain was just taken. Please choose a different one.')
        setSlugStatus('taken')
      } else if (apiError === 'slug_invalid') {
        setError('That subdomain is not allowed.')
        setSlugStatus('invalid')
      } else {
        setError('Could not create your shop. Please try again.')
      }
      setLoading(false)
      return
    }

    const { subdomain } = await res.json()
    window.location.href = tenantUrl(subdomain)
  }

  const slugIcon = {
    idle:      null,
    checking:  <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />,
    available: <Check className="w-3.5 h-3.5 text-green-500" />,
    taken:     <X className="w-3.5 h-3.5 text-red-500" />,
    invalid:   <X className="w-3.5 h-3.5 text-red-500" />,
  }

  const submitDisabled =
    loading ||
    slugStatus !== 'available' ||
    !email ||
    password.length < MIN_PASSWORD_LEN

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border-2 border-[var(--ink)] bg-white p-6 sm:p-10" style={{ boxShadow: '6px 6px 0 var(--ink)' }}>

        <AuthBrand />

        <div>
          <h1 className="bq-display text-3xl text-[var(--ink)]">Set up your shop</h1>
          <p className="mt-1 text-sm text-black/55">14 days free. No credit card required.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Shop name */}
          <div className="space-y-1.5">
            <label htmlFor="shopName" className="text-sm font-semibold text-[var(--ink)]">
              Shop name
            </label>
            <input
              id="shopName"
              type="text"
              required
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="FadeKing Barbershop"
              className="w-full rounded-lg border border-[var(--ink)]/20 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-[var(--red)]"
            />
          </div>

          {/* Subdomain */}
          <div className="space-y-1.5">
            <label htmlFor="slug" className="text-sm font-semibold text-[var(--ink)]">
              Your subdomain
            </label>
            <div className="flex items-stretch">
              <input
                id="slug"
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="fadeking"
                className="flex-1 rounded-l-lg border border-r-0 border-[var(--ink)]/20 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--red)]"
              />
              <span className="flex select-none items-center whitespace-nowrap rounded-r-lg border border-[var(--ink)]/20 bg-[var(--paper-2)] px-3 text-sm text-black/50">
                .barberqueue.pro
              </span>
            </div>
            {slug && (
              <p className={`text-xs flex items-center gap-1.5 ${slugColor[slugStatus]}`}>
                {slugIcon[slugStatus]}
                {slugStatus === 'available'
                  ? <><span className="font-medium">{slug}.barberqueue.pro</span> is available</>
                  : slugHelp[slugStatus]
                }
              </p>
            )}
          </div>

          {/* Email */}
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

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-[var(--ink)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={MIN_PASSWORD_LEN}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-[var(--ink)]/20 bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-[var(--red)]"
            />
            <p className="text-xs text-black/45">Minimum 8 characters.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--red)' }}
          >
            {loading ? 'Creating your shop...' : 'Create my shop'}
          </button>
        </form>

        <p className="text-center text-sm text-black/55">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[var(--red)] hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
