'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/lib/supabase/types'

type AppointmentWithClient = Tables<'appointments'> & {
  clients: { name: string; phone: string } | null
}

const statusStyles: Record<string, string> = {
  pending:   'bg-indigo-50 text-amber-700 ring-amber-200',
  completed: 'bg-green-50 text-green-700 ring-green-200',
  no_show:   'bg-red-50 text-red-700 ring-red-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
}

const statusLabel: Record<string, string> = {
  pending:   'Pending',
  completed: 'Completed',
  no_show:   'No show',
  cancelled:  'Cancelled',
}

export default function AppointmentsTodayTable({ appointments: initialAppointments }: { appointments: AppointmentWithClient[] }) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [completing, setCompleting] = useState<string | null>(null)
  const [marking, setMarking]       = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function completeAppointment(appointmentId: string) {
    setCompleting(appointmentId)

    const res = await fetch('/api/appointments/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId }),
    })

    if (res.ok) {
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: 'completed' as const } : a)
      )
      startTransition(() => router.refresh())
    }

    setCompleting(null)
  }

  async function markNoShow(appointmentId: string) {
    setMarking(appointmentId)

    const res = await fetch('/api/noshow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId }),
    })

    if (res.ok || res.status === 502) {
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: 'no_show' as const } : a)
      )
      startTransition(() => router.refresh())
    }

    setMarking(null)
  }

  async function cancelAppointment(appointmentId: string) {
    if (!window.confirm('Cancel this appointment? The client will get an SMS notification.')) return

    setCancelling(appointmentId)

    const res = await fetch('/api/appointments/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId }),
    })

    if (res.ok) {
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a)
      )
      startTransition(() => router.refresh())
    }

    setCancelling(null)
  }

  function ActionButtons({ id, full }: { id: string; full?: boolean }) {
    const busy = completing === id || marking === id || cancelling === id
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => completeAppointment(id)}
          disabled={busy}
          className={`text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}
        >
          {completing === id ? 'Saving...' : 'Complete'}
        </button>
        <button
          onClick={() => markNoShow(id)}
          disabled={busy}
          className={`text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}
        >
          {marking === id ? 'Saving...' : 'No show'}
        </button>
        <button
          onClick={() => cancelAppointment(id)}
          disabled={busy}
          className={`text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}
        >
          {cancelling === id ? 'Cancelling...' : 'Cancel'}
        </button>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
        <p className="text-slate-400 text-sm">No appointments for today.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile — card list */}
      <div className="space-y-3 md:hidden">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono font-semibold text-slate-900">
                {appointment.time.slice(0, 5)}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[appointment.status]}`}>
                {statusLabel[appointment.status]}
              </span>
            </div>
            <div className="mt-2">
              <p className="font-medium text-slate-900">{appointment.clients?.name ?? '—'}</p>
              <p className="text-xs text-slate-400">{appointment.clients?.phone}</p>
            </div>
            <p className="text-sm text-slate-600 mt-1">{appointment.service}</p>
            {appointment.status === 'pending' && (
              <div className="mt-3">
                <ActionButtons id={appointment.id} full />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop — table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Time</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Client</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Service</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                  {appointment.time.slice(0, 5)}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{appointment.clients?.name ?? '—'}</p>
                  <p className="text-xs text-slate-400">{appointment.clients?.phone}</p>
                </td>
                <td className="px-6 py-4 text-slate-600">{appointment.service}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[appointment.status]}`}>
                    {statusLabel[appointment.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {appointment.status === 'pending' && <ActionButtons id={appointment.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
