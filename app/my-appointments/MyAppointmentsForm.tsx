'use client'

import { useState } from 'react'
import { Phone, Calendar, Clock, Scissors, X, Loader2 } from 'lucide-react'

type Appointment = {
  id: string
  date: string
  time: string
  service: string
  duration_min: number | null
  barber_id: string | null
  barbers: { name: string } | null
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function formatTime(t: string) {
  const [hStr, m] = t.slice(0, 5).split(':')
  const h = parseInt(hStr, 10)
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function MyAppointmentsForm({ bookUrl }: { bookUrl: string }) {
  const [phone, setPhone]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAppointments(null)
    setCancelledIds(new Set())
    setLoading(true)
    try {
      const res  = await fetch(`/api/my-appointments?phone=${encodeURIComponent(phone.trim())}`)
      const data = await res.json() as { appointments?: Appointment[]; error?: string }
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setAppointments(data.appointments ?? [])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(apptId: string) {
    if (!confirm('Cancel this appointment?')) return
    setCancellingId(apptId)
    try {
      const res = await fetch(
        `/api/my-appointments/${apptId}?phone=${encodeURIComponent(phone.trim())}`,
        { method: 'DELETE' },
      )
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { setError(data.error ?? 'Could not cancel.'); return }
      setCancelledIds(prev => new Set([...prev, apptId]))
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  const visible = (appointments ?? []).filter(a => !cancelledIds.has(a.id))

  return (
    <div className="space-y-6">
      {/* Phone lookup form */}
      <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 416 555 1234"
            autoComplete="tel"
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find my appointments'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {appointments !== null && (
        <>
          {visible.length === 0 && cancelledIds.size === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No upcoming appointments</p>
              <p className="text-slate-400 text-sm mt-1">
                Nothing booked yet for this number.
              </p>
              <a
                href={bookUrl}
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Book an appointment →
              </a>
            </div>
          )}

          {visible.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Upcoming appointments
              </p>
              {visible.map(a => (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{a.service}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(a.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(a.time)}
                        {a.duration_min ? ` · ${a.duration_min}m` : ''}
                      </span>
                      {a.barbers?.name && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Scissors className="w-3 h-3" />
                          {a.barbers.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancel(a.id)}
                    disabled={cancellingId === a.id}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    {cancellingId === a.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <X className="w-3 h-3" />
                    }
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}

          {cancelledIds.size > 0 && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {cancelledIds.size === 1
                ? 'Appointment cancelled. You\'ll receive a confirmation text shortly.'
                : `${cancelledIds.size} appointments cancelled.`}
              {' '}
              <a href={bookUrl} className="font-semibold underline underline-offset-2">
                Book again
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}
