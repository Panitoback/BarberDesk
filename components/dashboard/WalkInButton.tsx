'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X } from 'lucide-react'

type Service = { name: string; price_cad: number }

export default function WalkInButton({ services }: { services: Service[] }) {
  const [open,      setOpen]      = useState(false)
  const [service,   setService]   = useState(services[0]?.name ?? '')
  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function openModal() {
    setService(services[0]?.name ?? '')
    setName('')
    setPhone('')
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    if (saving) return
    setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!service) { setError('Pick a service.'); return }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/walkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ service, name: name.trim(), phone: phone.trim() }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { setError(json.error ?? 'Something went wrong.'); return }

      setOpen(false)
      startTransition(() => router.refresh())
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (services.length === 0) return null

  return (
    <>
      <button
        onClick={openModal}
        type="button"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg min-h-[36px]"
      >
        <UserPlus className="w-4 h-4" />
        Walk-in
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Add walk-in</h2>
              <button
                onClick={closeModal}
                type="button"
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service — required */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="wi-service">
                  Service <span className="text-red-500">*</span>
                </label>
                <select
                  id="wi-service"
                  value={service}
                  onChange={e => setService(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] bg-white"
                >
                  {services.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} · ${s.price_cad}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name — optional */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="wi-name">
                  Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="wi-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Walk-in"
                  maxLength={80}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]"
                />
              </div>

              {/* Phone — optional */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="wi-phone">
                  Phone <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="wi-phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="416-555-0100"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {saving ? 'Saving…' : 'Add walk-in'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
