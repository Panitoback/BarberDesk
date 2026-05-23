'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, X } from 'lucide-react'

type Upcoming = {
  id: string
  date: string
  time: string
  service: string
  clients: { name: string; phone: string } | null
}

function formatDate(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`)
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function UpcomingBookings({ appointments: initial }: { appointments: Upcoming[] }) {
  const [appointments, setAppointments] = useState(initial)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function cancelAppointment(id: string) {
    if (!window.confirm('Cancel this appointment? The client will get an SMS notification.')) return

    setCancelling(id)
    const res = await fetch('/api/appointments/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: id }),
    })

    if (res.ok) {
      setAppointments(prev => prev.filter(a => a.id !== id))
      startTransition(() => router.refresh())
    }

    setCancelling(null)
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <Calendar className="w-5 h-5 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No upcoming bookings.</p>
        <p className="text-slate-400 text-xs mt-1">
          Self-bookings will show up here as soon as clients use your link.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <ul className="divide-y divide-slate-50">
        {appointments.map((a) => {
          const busy = cancelling === a.id
          return (
            <li key={a.id} className="p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-semibold text-amber-700 bg-indigo-50 ring-1 ring-amber-200 rounded-full px-2.5 py-0.5">
                    {formatDate(a.date)} · {a.time.slice(0, 5)}
                  </span>
                  <p className="font-medium text-slate-900 truncate">
                    {a.clients?.name ?? '—'}
                  </p>
                </div>
                <p className="text-sm text-slate-500 mt-1 truncate">
                  {a.service}
                  {a.clients?.phone && (
                    <span className="text-slate-400"> · {a.clients.phone}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => cancelAppointment(a.id)}
                disabled={busy}
                aria-label="Cancel this booking"
                className="text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors inline-flex items-center gap-1.5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                {busy ? 'Cancelling…' : 'Cancel'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
