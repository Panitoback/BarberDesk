'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SLUG_RE } from '@/lib/slug'
import { Scissors, Check, X, Loader2 } from 'lucide-react'

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
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [sent, setSent]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchParams = useSearchParams()

  // Handle slug-taken error returned from /auth/callback after race condition
  useEffect(() => {
    if (searchParams.get('error') === 'slug-taken') {
      setError('That subdomain was just taken by someone else. Please choose a different one.')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (slugStatus !== 'available') return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { protocol, hostname, port } = window.location
    const portSuffix = port ? `:${port}` : ''

    // Strip subdomain to get base origin (matches login page logic)
    const parts = hostname.split('.')
    const baseHost = parts.length > 2 ? parts.slice(1).join('.') : hostname
    const baseOrigin = `${protocol}//${baseHost}${portSuffix}`

    const params = new URLSearchParams({ shop: shopName.trim(), slug, next: '/' })
    const redirectTo = `${baseOrigin}/auth/callback?${params.toString()}`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (otpError) {
      setError(otpError.message)
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 w-full max-w-md text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-indigo-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            We sent a sign-in link to{' '}
            <span className="font-semibold text-slate-800">{email}</span>.
            Click it to create your shop and access your dashboard.
          </p>
          <div className="bg-slate-50 rounded-xl px-4 py-3 mt-2">
            <p className="text-xs text-slate-400 mb-0.5">Your shop will be at</p>
            <p className="font-mono text-sm font-semibold text-slate-700">
              {slug}.barberqueue.pro
            </p>
          </div>
        </div>
      </div>
    )
  }

  const slugIcon = {
    idle:      null,
    checking:  <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />,
    available: <Check className="w-3.5 h-3.5 text-green-500" />,
    taken:     <X className="w-3.5 h-3.5 text-red-500" />,
    invalid:   <X className="w-3.5 h-3.5 text-red-500" />,
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 w-full max-w-md space-y-6">

        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-slate-900 tracking-tight">BarberQueue</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Set up your shop</h1>
          <p className="text-slate-500 text-sm mt-1">7 days free. No credit card required.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Shop name */}
          <div className="space-y-1.5">
            <label htmlFor="shopName" className="text-sm font-medium text-slate-700">
              Shop name
            </label>
            <input
              id="shopName"
              type="text"
              required
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="FadeKing Barbershop"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Subdomain */}
          <div className="space-y-1.5">
            <label htmlFor="slug" className="text-sm font-medium text-slate-700">
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
                className="flex-1 rounded-l-lg border border-r-0 border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              />
              <span className="flex items-center bg-slate-50 border border-slate-300 rounded-r-lg px-3 text-sm text-slate-400 whitespace-nowrap select-none">
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
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || slugStatus !== 'available' || !email}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Sending link...' : 'Create my shop'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-slate-700 font-semibold hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
