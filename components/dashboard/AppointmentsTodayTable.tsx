'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/lib/supabase/types'
import type { Service } from '@/lib/tenant-config'
import CompleteModal from '@/components/dashboard/CompleteModal'

type AppointmentWithClient = Tables<'appointments'> & {
  clients: { name: string; phone: string | null } | null
  visits: { price: number | null }[] | null
}

function displayPrice(a: AppointmentWithClient): number | null {
  // Once completed, visits.price reflects extras the owner added at checkout.
  // Pending rows fall back to the booking snapshot on appointments.price.
  const visitPrice = a.visits?.[0]?.price
  return visitPrice ?? a.price ?? null
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
  cancelled: 'Cancelled',
}

type ModalState = { appointmentId: string; service: string; basePrice: number | null }

export default function AppointmentsTodayTable({
  appointments: initialAppointments,
  services,
}: {
  appointments: AppointmentWithClient[]
  services: Service[]
}) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [completing, setCompleting]     = useState(false)
  const [marking, setMarking]           = useState<string | null>(null)
  const [cancelling, setCancelling]     = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function openModal(appt: AppointmentWithClient) {
    setModal({
      appointmentId: appt.id,
      service:       appt.service,
      basePrice:     appt.price ?? null,
    })
  }

  async function handleComplete(finalPrice: number | null) {
    if (!modal) return
    setCompleting(true)

    const body: Record<string, unknown> = { appointment_id: modal.appointmentId }
    if (finalPrice !== null) body.final_price = finalPrice

    const res = await fetch('/api/appointments/complete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    if (res.ok) {
      const id = modal.appointmentId
      setAppointments(prev =>
        prev.map(a => a.id === id
          ? {
              ...a,
              status: 'completed' as const,
              visits: [{ price: finalPrice ?? a.price }],
            }
          : a)
      )
      setModal(null)
      startTransition(() => router.refresh())
    }

    setCompleting(false)
  }

  async function markNoShow(appointmentId: string) {
    setMarking(appointmentId)

    const res = await fetch('/api/noshow', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ appointment_id: appointmentId }),
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
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ appointment_id: appointmentId }),
    })

    if (res.ok) {
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a)
      )
      startTransition(() => router.refresh())
    }

    setCancelling(null)
  }

  function ActionButtons({ appt, full }: { appt: AppointmentWithClient; full?: boolean }) {
    const busy = completing || marking === appt.id || cancelling === appt.id
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => openModal(appt)}
          disabled={busy}
          className={`text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}
        >
          Complete
        </button>
        <button
          onClick={() => markNoShow(appt.id)}
          disabled={busy}
          className={`text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}
        >
          {marking === appt.id ? 'Saving...' : 'No show'}
        </button>
        <button
          onClick={() => cancelAppointment(appt.id)}
          disabled={busy}
          className={`text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}
        >
          {cancelling === appt.id ? 'Cancelling...' : 'Cancel'}
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
      {modal && (
        <CompleteModal
          service={modal.service}
          basePrice={modal.basePrice}
          services={services}
          onClose={() => setModal(null)}
          onConfirm={handleComplete}
          loading={completing}
        />
      )}

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
            {(() => {
              const price = displayPrice(appointment)
              return price !== null
                ? <p className="text-xs text-slate-400 mt-0.5">${price.toFixed(2)} CAD</p>
                : null
            })()}
            {appointment.status === 'pending' && (
              <div className="mt-3">
                <ActionButtons appt={appointment} full />
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
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Price</th>
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
                <td className="px-6 py-4 text-slate-600 font-mono whitespace-nowrap">
                  {(() => {
                    const price = displayPrice(appointment)
                    return price !== null
                      ? `$${price.toFixed(2)}`
                      : <span className="text-slate-300">—</span>
                  })()}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[appointment.status]}`}>
                    {statusLabel[appointment.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {appointment.status === 'pending' && <ActionButtons appt={appointment} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
