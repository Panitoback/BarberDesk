'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/lib/supabase/types'
import type { Service } from '@/lib/tenant-config'
import type { VisitExtra } from '@/lib/extras'
import { parseExtras } from '@/lib/extras'
import CompleteModal from '@/components/dashboard/CompleteModal'
import ServiceBreakdown from '@/components/dashboard/ServiceBreakdown'
import { Info, ChevronDown, BadgeCheck, Camera } from 'lucide-react'
import { barberColor } from '@/lib/barbers'

function DepositBadge({ paid, amount }: { paid: boolean | null; amount: number }) {
  if (!paid || !amount) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-2 py-0.5">
      <BadgeCheck className="w-3 h-3" />
      Deposit ${amount.toFixed(2)}
    </span>
  )
}

function FullPaymentBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-2 py-0.5">
      <BadgeCheck className="w-3 h-3" />
      Paid in full
    </span>
  )
}

function ClientNoteRow({ note, photoUrl }: { note: string | null; photoUrl?: string | null }) {
  const [photoOpen, setPhotoOpen] = useState(false)
  if (!note && !photoUrl) return null
  return (
    <div className="mt-1.5 space-y-1">
      {note && (
        <div className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
          <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
          <span className="break-words">{note}</span>
        </div>
      )}
      {photoUrl && (
        <>
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-1.5 hover:bg-indigo-100 transition-colors"
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>View haircut reference photo</span>
          </button>
          {photoOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setPhotoOpen(false)}
            >
              <div className="relative max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <img src={photoUrl} alt="Haircut reference" className="w-full object-contain max-h-[70vh]" />
                <button
                  onClick={() => setPhotoOpen(false)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

type BarberOption = { id: string; name: string; display_order: number }

type AppointmentWithClient = Tables<'appointments'> & {
  clients:      { name: string; phone: string | null } | null
  visits:       { price: number | null; extras: unknown }[] | null
  deposit_paid: boolean | null
}

function displayPrice(a: AppointmentWithClient): number | null {
  const visitPrice = a.visits?.[0]?.price
  return visitPrice ?? a.price ?? null
}

function visitExtras(a: AppointmentWithClient): VisitExtra[] {
  return parseExtras(a.visits?.[0]?.extras)
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

type ModalState = { appointmentId: string; service: string; basePrice: number | null; depositPaid: boolean; depositAmount: number; fullPaymentActive: boolean }

function BarberBadge({
  barberId,
  barbers,
  appointmentId,
  onReassign,
}: {
  barberId:      string | null
  barbers:       BarberOption[]
  appointmentId: string
  onReassign:    (apptId: string, barberId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const barberIndex = barbers.findIndex(b => b.id === barberId)
  const barber      = barberIndex >= 0 ? barbers[barberIndex] : null
  const color       = barber ? barberColor(barberIndex) : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => barbers.length > 0 && setOpen(o => !o)}
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
          color
            ? `${color.badge} hover:opacity-80`
            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
        }`}
      >
        {barber ? barber.name : 'Unassigned'}
        {barbers.length > 0 && <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm">
          <button
            className="w-full text-left px-3 py-1.5 text-slate-400 hover:bg-slate-50 text-xs"
            onClick={() => { onReassign(appointmentId, null); setOpen(false) }}
          >
            Unassigned
          </button>
          {barbers.map((b, i) => (
            <button
              key={b.id}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-xs"
              onClick={() => { onReassign(appointmentId, b.id); setOpen(false) }}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${barberColor(i).dot}`} />
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppointmentsTodayTable({
  appointments: initialAppointments,
  services,
  barbers = [],
  depositAmountCad = 0,
  fullPaymentActive = false,
}: {
  appointments:      AppointmentWithClient[]
  services:          Service[]
  barbers?:          BarberOption[]
  depositAmountCad?: number
  fullPaymentActive?: boolean
}) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [completing, setCompleting]     = useState(false)
  const [marking, setMarking]           = useState<string | null>(null)
  const [cancelling, setCancelling]     = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const showBarbers = barbers.length > 0

  function openModal(appt: AppointmentWithClient) {
    setModal({
      appointmentId:    appt.id,
      service:          appt.service,
      basePrice:        appt.price ?? null,
      depositPaid:      appt.deposit_paid ?? false,
      depositAmount:    depositAmountCad,
      fullPaymentActive,
    })
  }

  async function handleComplete(finalPrice: number | null, extras: VisitExtra[]) {
    if (!modal) return
    setCompleting(true)
    const body: Record<string, unknown> = { appointment_id: modal.appointmentId }
    if (finalPrice !== null) body.final_price = finalPrice
    if (extras.length > 0)   body.extras      = extras

    const res = await fetch('/api/appointments/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      const id = modal.appointmentId
      setAppointments(prev => prev.map(a => a.id === id
        ? { ...a, status: 'completed' as const, visits: [{ price: finalPrice ?? a.price, extras }] }
        : a))
      setModal(null)
      startTransition(() => router.refresh())
    }
    setCompleting(false)
  }

  async function markNoShow(appointmentId: string) {
    setMarking(appointmentId)
    const res = await fetch('/api/noshow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId }),
    })
    if (res.ok || res.status === 502) {
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'no_show' as const } : a))
      startTransition(() => router.refresh())
    }
    setMarking(null)
  }

  async function cancelAppointment(appointmentId: string) {
    if (!window.confirm('Cancel this appointment? The client will get an SMS notification.')) return
    setCancelling(appointmentId)
    const res = await fetch('/api/appointments/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId }),
    })
    if (res.ok) {
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a))
      startTransition(() => router.refresh())
    }
    setCancelling(null)
  }

  async function handleReassign(appointmentId: string, newBarberId: string | null) {
    const res = await fetch(`/api/appointments/${appointmentId}/reassign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barber_id: newBarberId }),
    })
    if (res.ok) {
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, barber_id: newBarberId } : a))
    }
  }

  function ActionButtons({ appt, full }: { appt: AppointmentWithClient; full?: boolean }) {
    const busy = completing || marking === appt.id || cancelling === appt.id
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => openModal(appt)} disabled={busy}
          className={`text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}>
          Complete
        </button>
        <button onClick={() => markNoShow(appt.id)} disabled={busy}
          className={`text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}>
          {marking === appt.id ? 'Saving...' : 'No show'}
        </button>
        <button onClick={() => cancelAppointment(appt.id)} disabled={busy}
          className={`text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors ${full ? 'flex-1' : 'py-1.5'}`}>
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
          depositPaid={modal.depositPaid}
          depositAmount={modal.depositAmount}
          fullPaymentActive={modal.fullPaymentActive}
        />
      )}

      {/* Mobile — card list */}
      <div className="space-y-3 md:hidden">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono font-semibold text-slate-900">{appointment.time.slice(0, 5)}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[appointment.status]}`}>
                {statusLabel[appointment.status]}
              </span>
            </div>
            <div className="mt-2 min-w-0">
              <p className="font-medium text-slate-900 truncate">{appointment.clients?.name ?? '—'}</p>
              <p className="text-xs text-slate-400 truncate">{appointment.clients?.phone}</p>
              {showBarbers && (
                <div className="mt-1.5">
                  <BarberBadge
                    barberId={appointment.barber_id}
                    barbers={barbers}
                    appointmentId={appointment.id}
                    onReassign={handleReassign}
                  />
                </div>
              )}
              <ClientNoteRow note={appointment.client_note} photoUrl={appointment.haircut_photo_url} />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-sm text-slate-600">{appointment.service}</p>
              <ServiceBreakdown service={appointment.service} basePrice={appointment.price} extras={visitExtras(appointment)} total={displayPrice(appointment)} />
            </div>
            {(() => {
              const price = displayPrice(appointment)
              const isFullyPaid = fullPaymentActive && !!appointment.deposit_paid
              const isDeposit   = !fullPaymentActive && !!appointment.deposit_paid && depositAmountCad > 0
              const remaining   = isDeposit && price !== null ? Math.max(0, price - depositAmountCad) : null
              return (
                <div className="mt-1 space-y-1">
                  {price !== null && <p className="text-xs text-slate-400">${price.toFixed(2)} CAD</p>}
                  {isFullyPaid && <FullPaymentBadge />}
                  {isDeposit && <DepositBadge paid amount={depositAmountCad} />}
                  {remaining !== null && (
                    <p className="text-xs font-semibold text-amber-700">Owes: ${remaining.toFixed(2)} CAD</p>
                  )}
                </div>
              )
            })()}
            {appointment.status === 'pending' && (
              <div className="mt-3"><ActionButtons appt={appointment} full /></div>
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
              {showBarbers && <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Barber</th>}
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
                  <ClientNoteRow note={appointment.client_note} photoUrl={appointment.haircut_photo_url} />
                </td>
                {showBarbers && (
                  <td className="px-6 py-4">
                    <BarberBadge
                      barberId={appointment.barber_id}
                      barbers={barbers}
                      appointmentId={appointment.id}
                      onReassign={handleReassign}
                    />
                  </td>
                )}
                <td className="px-6 py-4 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span>{appointment.service}</span>
                    <ServiceBreakdown service={appointment.service} basePrice={appointment.price} extras={visitExtras(appointment)} total={displayPrice(appointment)} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const price       = displayPrice(appointment)
                    const isFullyPaid = fullPaymentActive && !!appointment.deposit_paid
                    const isDeposit   = !fullPaymentActive && !!appointment.deposit_paid && depositAmountCad > 0
                    const remaining   = isDeposit && price !== null ? Math.max(0, price - depositAmountCad) : null
                    return (
                      <div className="space-y-1">
                        <p className="font-mono text-slate-600 whitespace-nowrap">
                          {price !== null ? `$${price.toFixed(2)}` : <span className="text-slate-300">—</span>}
                        </p>
                        {isFullyPaid && <FullPaymentBadge />}
                        {isDeposit && <DepositBadge paid amount={depositAmountCad} />}
                        {remaining !== null && (
                          <p className="text-xs font-semibold text-amber-700 whitespace-nowrap">Owes: ${remaining.toFixed(2)}</p>
                        )}
                      </div>
                    )
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
