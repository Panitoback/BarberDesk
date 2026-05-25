'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, X } from 'lucide-react'

type Service = { name: string; price_cad: number }

const ALL_SLOTS = (() => {
  const slots: string[] = []
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
})()

function formatTimeLabel(t: string): string {
  const [hStr, m] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${period}`
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function NewAppointmentButton({ services }: { services: Service[] }) {
  const [open,       setOpen]       = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [service,    setService]    = useState(services[0]?.name ?? '')
  const [date,       setDate]       = useState(todayISO())
  const [time,       setTime]       = useState(ALL_SLOTS[0])
  const [taken,      setTaken]      = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!open || !date) return
    setLoadingSlots(true)
    fetch(`/api/book/slots?date=${encodeURIComponent(date)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { taken: [] })
      .then((data: { taken?: string[] }) => {
        const takenArr = Array.isArray(data.taken) ? data.taken : []
        setTaken(takenArr)
        setLoadingSlots(false)
        // Sync time to first available slot after loading
        const available = ALL_SLOTS.filter(s => !takenArr.includes(s))
        if (available.length > 0) setTime(available[0])
      })
      .catch(() => { setTaken([]); setLoadingSlots(false) })
  }, [open, date])

  const availableSlots = ALL_SLOTS.filter(s => !taken.includes(s))
  const noSlots = !loadingSlots && availableSlots.length === 0

  function openModal() {
    setClientName(''); setClientPhone(''); setService(services[0]?.name ?? '')
    setDate(todayISO()); setTime(ALL_SLOTS[0]); setError(null)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim() || clientName.trim().length < 2) { setError('Enter the client name.'); return }
    if (!service)           { setError('Pick a service.'); return }
    if (!time || noSlots)   { setError('No available slots for this date.'); return }

    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/appointments/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_name: clientName.trim(), client_phone: clientPhone.trim(), service, date, time }),
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
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg min-h-[36px]"
      >
        <CalendarPlus className="w-4 h-4" />
        New appointment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setOpen(false)} aria-hidden />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">New appointment</h2>
              <button onClick={() => !saving && setOpen(false)} type="button" aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Client name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="Jordan Smith" maxLength={80}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  placeholder="416-555-0100"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Service <span className="text-red-500">*</span>
                </label>
                <select value={service} onChange={e => setService(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px] bg-white">
                  {services.map(s => (
                    <option key={s.name} value={s.name}>{s.name} · ${s.price_cad}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" value={date} min={todayISO()} onChange={e => setDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <select value={time} onChange={e => setTime(e.target.value)}
                    disabled={loadingSlots || noSlots}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px] bg-white disabled:opacity-60">
                    {loadingSlots
                      ? <option>Loading…</option>
                      : noSlots
                        ? <option>No slots available</option>
                        : availableSlots.map(s => <option key={s} value={s}>{formatTimeLabel(s)}</option>)
                    }
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 min-h-[44px]">
                {saving ? 'Saving…' : 'Book appointment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
