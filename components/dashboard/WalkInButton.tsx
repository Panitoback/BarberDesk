'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X, Plus, Trash2 } from 'lucide-react'
import type { Service } from '@/lib/tenant-config'

type Extra = { id: number; name: string; price: number }

let nextId = 1

export default function WalkInButton({ services }: { services: Service[] }) {
  const [open,        setOpen]        = useState(false)
  const [primary,     setPrimary]     = useState(services[0]?.name ?? '')
  const [extras,      setExtras]      = useState<Extra[]>([])
  const [extraPick,   setExtraPick]   = useState('')
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function openModal() {
    setPrimary(services[0]?.name ?? '')
    setExtras([])
    setExtraPick('')
    setName('')
    setPhone('')
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    if (saving) return
    setOpen(false)
  }

  function addExtra() {
    const svc = services.find(s => s.name === extraPick)
    if (!svc) return
    setExtras(prev => [...prev, { id: nextId++, name: svc.name, price: svc.price_cad }])
    setExtraPick('')
  }

  function removeExtra(id: number) {
    setExtras(prev => prev.filter(e => e.id !== id))
  }

  const primaryPrice = services.find(s => s.name === primary)?.price_cad ?? 0
  const extrasTotal  = extras.reduce((sum, e) => sum + e.price, 0)
  const total        = primaryPrice + extrasTotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!primary) { setError('Pick a service.'); return }
    setSaving(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        service: primary,
        name:    name.trim(),
        phone:   phone.trim(),
      }
      if (extras.length > 0) body.final_price = total

      const res = await fetch('/api/walkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >

          <div className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
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

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

              {/* Primary service */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="wi-service">
                  Service <span className="text-red-500">*</span>
                </label>
                <select
                  id="wi-service"
                  value={primary}
                  onChange={e => setPrimary(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {services.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} · ${s.price_cad.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Extra services */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Extra services <span className="text-slate-400 font-normal">(optional)</span></p>
                <div className="flex gap-2 mb-2">
                  <select
                    value={extraPick}
                    onChange={e => setExtraPick(e.target.value)}
                    className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                  >
                    <option value="">Select…</option>
                    {services.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name} · ${s.price_cad.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addExtra}
                    disabled={!extraPick}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {extras.length > 0 && (
                  <ul className="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
                    {extras.map(e => (
                      <li key={e.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-slate-800">{e.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-slate-600">${e.price.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removeExtra(e.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-700">Total</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    ${total.toFixed(2)} CAD
                  </span>
                </div>
              </div>

              {/* Name */}
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
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Phone */}
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
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

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
