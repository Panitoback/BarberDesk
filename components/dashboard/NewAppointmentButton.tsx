'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, X } from 'lucide-react'

type Service    = { name: string; price_cad: number; duration_min: number }
type BarberOption = { id: string; name: string; display_order: number }

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

export default function NewAppointmentButton({
  services,
  barbers = [],
}: {
  services: Service[]
  barbers?: BarberOption[]
}) {
  const [open,        setOpen]        = useState(false)
  const [clientName,  setClientName]  = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [service,     setService]     = useState(services[0]?.name ?? '')
  const [barberId,    setBarberId]    = useState<string>('any')
  const [date,        setDate]        = useState(todayISO())
  const [time,        setTime]        = useState('')
  const [daySlots,    setDaySlots]    = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const showBarbers      = barbers.length > 0
  const selectedDuration = services.find(s => s.name === service)?.duration_min ?? 30

  useEffect(() => {
    if (!open || !date) return
    setLoadingSlots(true)
    const barberParam = showBarbers ? `&barber_id=${encodeURIComponent(barberId)}` : ''
    fetch(
      `/api/book/slots?date=${encodeURIComponent(date)}&duration=${selectedDuration}${barberParam}`,
      { cache: 'no-store' },
    )
      .then(r => r.ok ? r.json() : { taken: [], slots: [] })
      .then((data: { taken?: string[]; slots?: string[] }) => {
        const slotsArr = Array.isArray(data.slots) ? data.slots : []
        setDaySlots(slotsArr)
        setLoadingSlots(false)
        // `slotsArr` from the API already filters out occupied and ineligible
        // starts for the chosen duration, so first item is the first bookable.
        setTime(slotsArr[0] ?? '')
      })
      .catch(() => { setDaySlots([]); setLoadingSlots(false) })
  }, [open, date, selectedDuration, barberId, showBarbers])

  const availableSlots = daySlots
  const noSlots = !loadingSlots && availableSlots.length === 0

  function openModal() {
    setClientName(''); setClientPhone(''); setService(services[0]?.name ?? '')
    setBarberId('any'); setDate(todayISO()); setTime(''); setError(null)
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
        body:    JSON.stringify({
          client_name:  clientName.trim(),
          client_phone: clientPhone.trim(),
          service,
          date,
          time,
          ...(showBarbers ? { barber_id: barberId } : {}),
        }),
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
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  placeholder="416-555-0100"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]" />
              </div>

              {showBarbers && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Barber</label>
                  <select value={barberId} onChange={e => setBarberId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] bg-white">
                    <option value="any">Any available</option>
                    {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Service <span className="text-red-500">*</span>
                </label>
                <select value={service} onChange={e => setService(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] bg-white">
                  {services.map(s => (
                    <option key={s.name} value={s.name}>{s.name} · ${s.price_cad}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" value={date} min={todayISO()} onChange={e => setDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <select value={time} onChange={e => setTime(e.target.value)}
                    disabled={loadingSlots || noSlots}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] bg-white disabled:opacity-60">
                    {loadingSlots
                      ? <option>Loading…</option>
                      : noSlots
                        ? <option>{daySlots.length === 0 ? 'Shop closed this day' : 'No slots available'}</option>
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
