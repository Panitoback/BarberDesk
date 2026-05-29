'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, X, Trash2 } from 'lucide-react'

export type TimeBlockRow = {
  id:         string
  date:       string
  start_time: string
  end_time:   string
  reason:     string | null
  all_day:    boolean
  barber_id:  string | null
}

type BarberOption = { id: string; name: string; display_order: number }

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    day: 'numeric', month: 'short',
  })
}

export default function BlockTimeButton({
  upcomingBlocks,
  barbers = [],
}: {
  upcomingBlocks: TimeBlockRow[]
  barbers?:       BarberOption[]
}) {
  const router = useRouter()
  const [open,      setOpen]      = useState(false)
  const [date,      setDate]      = useState(todayISO())
  const [allDay,    setAllDay]    = useState(false)
  const [startTime, setStartTime] = useState('12:00')
  const [endTime,   setEndTime]   = useState('13:00')
  const [reason,    setReason]    = useState('')
  const [barberId,  setBarberId]  = useState<string>('shop')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const showBarbers = barbers.length > 0

  function openModal() {
    setDate(todayISO()); setAllDay(false)
    setStartTime('12:00'); setEndTime('13:00'); setReason('')
    setBarberId('shop'); setError(null); setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/time-blocks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          date,
          all_day:    allDay,
          start_time: allDay ? undefined : startTime,
          end_time:   allDay ? undefined : endTime,
          reason:     reason.trim() || undefined,
          barber_id:  showBarbers && barberId !== 'shop' ? barberId : undefined,
        }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { setError(json.error ?? 'Could not save block.'); return }
      setOpen(false)
      startTransition(() => router.refresh())
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this block?')) return
    const res = await fetch(`/api/time-blocks/${id}`, { method: 'DELETE' })
    if (res.ok) startTransition(() => router.refresh())
  }

  return (
    <>
      <button
        onClick={openModal}
        type="button"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg min-h-[36px]"
      >
        <Ban className="w-4 h-4 text-slate-500" />
        Block time
      </button>

      {upcomingBlocks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Upcoming blocks</h3>
          <ul className="divide-y divide-slate-50">
            {upcomingBlocks.map(b => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-slate-900">{formatDate(b.date)}</span>
                  <span className="text-slate-500 ml-2">
                    {b.all_day
                      ? 'All day'
                      : `${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)}`}
                  </span>
                  {b.barber_id && barbers.length > 0 && (
                    <span className="text-indigo-500 ml-2 text-xs shrink-0">
                      {barbers.find(bar => bar.id === b.barber_id)?.name ?? 'Barber'} only
                    </span>
                  )}
                  {b.reason && <span className="text-slate-400 ml-2 truncate">· {b.reason}</span>}
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  type="button"
                  aria-label="Remove block"
                  className="text-slate-400 hover:text-red-600 p-1 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setOpen(false)} aria-hidden />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Block time</h2>
              <button onClick={() => !saving && setOpen(false)} type="button" aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={date} min={todayISO()}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]" />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={allDay}
                  onChange={e => setAllDay(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300" />
                All day
              </label>

              {!allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                    <input type="time" value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                    <input type="time" value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]" />
                  </div>
                </div>
              )}

              {showBarbers && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Applies to</label>
                  <select value={barberId} onChange={e => setBarberId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] bg-white">
                    <option value="shop">Entire shop</option>
                    {barbers.map(b => <option key={b.id} value={b.id}>{b.name} only</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input type="text" value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Lunch, vacation, sick day…" maxLength={200}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[44px]" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={saving}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 min-h-[44px]">
                {saving ? 'Saving…' : 'Block this time'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
