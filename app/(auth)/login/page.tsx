'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function getBaseOrigin(): string {
    const { protocol, hostname, port } = window.location
    const portSuffix = port ? `:${port}` : ''
    if (hostname.includes('localhost')) {
      return `${protocol}//localhost${portSuffix}`
    }
    // Producción: carlos.barberpro.ca → barberpro.ca
    const parts = hostname.split('.')
    const base = parts.length > 2 ? parts.slice(1).join('.') : hostname
    return `${protocol}//${base}${portSuffix}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectTo = `${getBaseOrigin()}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
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
          <h1 className="text-xl font-semibold text-zinc-900">Revisa tu correo</h1>
          <p className="text-zinc-500 text-sm">
            Enviamos un link a <span className="font-medium text-zinc-800">{email}</span>.
            Haz click en el link para entrar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900">Entrar a BarberPro</h1>
          <p className="text-zinc-500 text-sm">Te enviamos un link mágico a tu correo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Enviando...' : 'Enviar link de acceso'}
          </Button>
        </form>
      </div>
    </div>
  )
}
