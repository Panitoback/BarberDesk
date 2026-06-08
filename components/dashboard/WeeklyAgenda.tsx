'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { barberColor } from '@/lib/barbers'
import CompleteModal from '@/components/dashboard/CompleteModal'
import type { Service } from '@/lib/tenant-config'

function NoteButton({ note }: { note: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex">
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(o => !o) }} aria-label="Show client note" className="inline-flex items-center">
        <Info className="w-3 h-3 shrink-0 text-amber-600" />
      </button>
      {open && (
        <span className="absolute z-20 top-full left-0 mt-1 w-48 text-[11px] font-normal text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 shadow-lg whitespace-normal break-words">
          {note}
        </span>
      )}
    </span>
  )
}

type BarberOption = { id: string; name: string; display_order: number }

type Appointment = {
  id:           string
  time:         string
  service:      string
  status:       string
  price:        number | null
  deposit_paid: boolean | null
  client_note:  string | null
  barber_id:    string | null
  clients:      { name: string } | null
}

type ModalState = {
  appointmentId:    string
  service:          string
  basePrice:        number | null
  depositPaid:      boolean
  depositAmount:    number
  fullPaymentActive: boolean
}

type Block = {
  start_time: string
  end_time:   string
  all_day:    boolean
  reason:     string | null
}

type DayData = {
  dateISO:      string
  label:        string
  isToday:      boolean
  appointments: Appointment[]
  blocks:       Block[]
}

function timeToMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function isSlotBlocked(slot: string, blocks: Block[]): Block | null {
  const slotMin = timeToMin(slot)
  for (const b of blocks) {
    if (b.all_day) return b
    const start = timeToMin(b.start_time)
    const end   = timeToMin(b.end_time)
    if (slotMin + 30 > start && slotMin < end) return b
  }
  return null
}

const SLOTS = (() => {
  const s: string[] = []
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue
      s.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return s
})()

function formatTimeLabel(t: string): string {
  const [hStr, m] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m}`
}

function appointmentSlot(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const roundedM = m < 30 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${roundedM}`
}

const statusColors: Record<string, string> = {
  pending:   'bg-indigo-50 border-indigo-300 text-indigo-800',
  completed: 'bg-green-50 border-green-300 text-green-800',
  no_show:   'bg-red-50 border-red-300 text-red-700',
  cancelled: 'bg-slate-50 border-slate-300 text-slate-500',
}

function shiftWeek(monday: string, delta: number): string {
  const d = new Date(monday + 'T12:00:00')
  d.setDate(d.getDate() + delta * 7)
  return d.toISOString().slice(0, 10)
}

export default function WeeklyAgenda({
  days,
  monday,
  barbers = [],
  services = [],
  depositAmountCad = 0,
  fullPaymentActive = false,
}: {
  days:               DayData[]
  monday:             string
  barbers?:           BarberOption[]
  services?:          Service[]
  depositAmountCad?:  number
  fullPaymentActive?: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [filterBarberId, setFilterBarberId] = useState<string>('all')
  const [modal, setModal]         = useState<ModalState | null>(null)
  const [actionOpen, setActionOpen] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const [completing, setCompleting] = useState(false)
  const [marking, setMarking]     = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    if (!actionOpen) return
    function close() { setActionOpen(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [actionOpen])

  function openModal(appt: Appointment) {
    setModal({
      appointmentId:    appt.id,
      service:          appt.service,
      basePrice:        appt.price,
      depositPaid:      appt.deposit_paid ?? false,
      depositAmount:    depositAmountCad,
      fullPaymentActive,
    })
    setActionOpen(null)
  }

  async function handleComplete(finalPrice: number | null, extras: import('@/lib/extras').VisitExtra[]) {
    if (!modal) return
    setCompleting(true)
    const body: Record<string, unknown> = { appointment_id: modal.appointmentId }
    if (finalPrice !== null) body.final_price = finalPrice
    if (extras.length > 0)   body.extras      = extras
    const res = await fetch('/api/appointments/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      setStatusOverrides(prev => ({ ...prev, [modal.appointmentId]: 'completed' }))
      setModal(null)
      startTransition(() => router.refresh())
    }
    setCompleting(false)
  }

  async function markNoShow(appointmentId: string) {
    setMarking(appointmentId)
    setActionOpen(null)
    const res = await fetch('/api/noshow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId }),
    })
    if (res.ok || res.status === 502) {
      setStatusOverrides(prev => ({ ...prev, [appointmentId]: 'no_show' }))
      startTransition(() => router.refresh())
    }
    setMarking(null)
  }

  async function cancelAppointment(appointmentId: string) {
    if (!window.confirm('Cancel this appointment? The client will get an SMS notification.')) return
    setCancelling(appointmentId)
    setActionOpen(null)
    const res = await fetch('/api/appointments/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId }),
    })
    if (res.ok) {
      setStatusOverrides(prev => ({ ...prev, [appointmentId]: 'cancelled' }))
      startTransition(() => router.refresh())
    }
    setCancelling(null)
  }

  const showBarbers    = barbers.length > 0
  const barberIndexMap = new Map(barbers.map((b, i) => [b.id, i]))

  function navigate(delta: number) {
    router.push(`/agenda?week=${shiftWeek(monday, delta)}`)
  }

  const weekLabel = (() => {
    const start = new Date(days[0].dateISO + 'T12:00:00')
    const end   = new Date(days[6].dateISO + 'T12:00:00')
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-CA', opts)} – ${end.toLocaleDateString('en-CA', { ...opts, year: 'numeric' })}`
  })()

  function filterAppts(appts: Appointment[]): Appointment[] {
    if (!showBarbers || filterBarberId === 'all') return appts
    if (filterBarberId === 'unassigned') return appts.filter(a => !a.barber_id)
    return appts.filter(a => a.barber_id === filterBarberId)
  }

  return (
    <div className="space-y-4">
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
      {/* Week navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} type="button"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">{weekLabel}</span>
          <button onClick={() => navigate(1)} type="button"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Barber filter pills */}
      {showBarbers && (
        <div className="flex flex-wrap gap-2">
          <FilterPill label="All" active={filterBarberId === 'all'} onClick={() => setFilterBarberId('all')} />
          {barbers.map((b, i) => (
            <FilterPill
              key={b.id}
              label={b.name}
              active={filterBarberId === b.id}
              color={barberColor(i).dot}
              onClick={() => setFilterBarberId(b.id)}
            />
          ))}
          <FilterPill
            label="Unassigned"
            active={filterBarberId === 'unassigned'}
            onClick={() => setFilterBarberId('unassigned')}
          />
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 sm:rounded-2xl border border-slate-100 shadow-sm bg-white">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            <div className="py-3" />
            {days.map(day => (
              <div key={day.dateISO}
                className={`py-3 text-center border-l border-slate-100 ${day.isToday ? 'bg-indigo-50' : ''}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${day.isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {new Date(day.dateISO + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short' })}
                </p>
                <p className={`text-lg font-bold leading-tight ${day.isToday ? 'text-indigo-600' : 'text-slate-800'}`}>
                  {new Date(day.dateISO + 'T12:00:00').getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Time rows */}
          {SLOTS.map(slot => (
            <div key={slot} className="grid border-b border-slate-50 last:border-0"
              style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              <div className="px-2 py-1 flex items-start justify-end">
                {slot.endsWith(':00') && (
                  <span className="text-[10px] text-slate-400 font-medium -mt-2">
                    {formatTimeLabel(slot)}
                  </span>
                )}
              </div>
              {days.map(day => {
                const appts = filterAppts(day.appointments).filter(a => appointmentSlot(a.time) === slot)
                const block = isSlotBlocked(slot, day.blocks)
                return (
                  <div key={day.dateISO}
                    title={block?.reason ?? (block ? 'Blocked' : undefined)}
                    className={`border-l border-slate-100 min-h-[36px] p-0.5 relative ${
                      block
                        ? 'bg-[repeating-linear-gradient(45deg,#f1f5f9_0_6px,#e2e8f0_6px_12px)]'
                        : day.isToday ? 'bg-indigo-50/30' : ''
                    }`}>
                    {appts.map(appt => {
                      const bIdx          = appt.barber_id ? barberIndexMap.get(appt.barber_id) : undefined
                      const bColor        = bIdx !== undefined ? barberColor(bIdx) : null
                      const effectiveStatus = statusOverrides[appt.id] ?? appt.status
                      const isPending     = effectiveStatus === 'pending'
                      const isActionOpen  = actionOpen === appt.id
                      const isBusy        = marking === appt.id || cancelling === appt.id
                      return (
                        <div key={appt.id}
                          onClick={e => {
                            if (!isPending) return
                            e.stopPropagation()
                            setActionOpen(o => o === appt.id ? null : appt.id)
                          }}
                          className={`text-[11px] font-medium rounded px-1.5 py-1 border mb-0.5 leading-tight border-l-4 ${
                            statusColors[effectiveStatus] ?? statusColors.pending
                          } ${bColor ? bColor.border : 'border-l-slate-300'} ${
                            isPending ? 'cursor-pointer hover:brightness-95 select-none' : ''
                          }`}>
                          <div className="flex items-center gap-1 font-semibold">
                            <span className="truncate">{appt.clients?.name ?? 'Walk-in'}</span>
                            {appt.client_note && <NoteButton note={appt.client_note} />}
                          </div>
                          <div className="opacity-75 truncate">{appt.service}</div>
                          {isActionOpen && (
                            <div
                              className="flex gap-0.5 mt-1 pt-1 border-t border-current/20"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={() => openModal(appt)}
                                disabled={isBusy}
                                className="flex-1 text-[9px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded px-0.5 py-0.5 transition-colors disabled:opacity-50"
                              >
                                Done
                              </button>
                              <button
                                onClick={() => markNoShow(appt.id)}
                                disabled={isBusy}
                                className="flex-1 text-[9px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded px-0.5 py-0.5 transition-colors disabled:opacity-50"
                              >
                                {marking === appt.id ? '…' : 'No-show'}
                              </button>
                              <button
                                onClick={() => cancelAppointment(appt.id)}
                                disabled={isBusy}
                                className="flex-1 text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded px-0.5 py-0.5 transition-colors disabled:opacity-50"
                              >
                                {cancelling === appt.id ? '…' : 'Cancel'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label:   string
  active:  boolean
  color?:  string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
        active
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {color && <span className={`w-2 h-2 rounded-full ${color}`} />}
      {label}
    </button>
  )
}
