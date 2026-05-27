'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, Phone, Mail, Scissors as ScissorsIcon, ArrowRight } from 'lucide-react'
import type { Service } from '@/lib/tenant-config'

type Props = {
  services: Service[]
  shopName: string
}

function formatPrice(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function slotMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number)
  return h * 60 + m
}

function formatTimeLabel(t: string): string {
  const [hStr, m] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${period}`
}

export default function BookingForm({ services, shopName }: Props) {
  const router = useRouter()
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [service, setService] = useState(services[0]?.name ?? '')
  const [date, setDate]       = useState(todayISO())
  const [time, setTime]       = useState('')
  const [taken, setTaken]     = useState<string[]>([])
  const [daySlots, setDaySlots] = useState<string[]>([])
  const [takenForDate, setTakenForDate] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const minDate = useMemo(() => todayISO(), [])
  const loadingSlots = takenForDate !== date

  const availableSlots = useMemo(() => {
    if (loadingSlots) return [] satisfies string[]
    const isToday = date === minDate
    const cutoff = isToday ? nowMinutes() : -1
    const takenSet = new Set(taken)
    return daySlots.filter(s => !takenSet.has(s) && slotMinutes(s) > cutoff)
  }, [date, minDate, taken, daySlots, loadingSlots])

  // Render selected time only if it's currently available; otherwise fall
  // back to the first option without mutating `time` (avoids set-state-in-effect).
  const effectiveTime = availableSlots.includes(time)
    ? time
    : (availableSlots[0] ?? '')

  useEffect(() => {
    let cancelled = false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return

    fetch(`/api/book/slots?date=${encodeURIComponent(date)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { taken: [], slots: [] })
      .then((data: { taken?: string[]; slots?: string[] }) => {
        if (cancelled) return
        setTaken(Array.isArray(data.taken) ? data.taken : [])
        setDaySlots(Array.isArray(data.slots) ? data.slots : [])
        setTakenForDate(date)
      })
      .catch(() => {
        if (cancelled) return
        setTaken([])
        setDaySlots([])
        setTakenForDate(date)
      })

    return () => { cancelled = true }
  }, [date])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name.')
      return
    }
    if (!phone.trim()) {
      setError('Please enter your phone number.')
      return
    }
    if (!service) {
      setError('Please pick a service.')
      return
    }
    if (!effectiveTime) {
      setError('Please pick an available time.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:  name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          service,
          date,
          time: effectiveTime,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409) {
        setTaken(prev => prev.includes(effectiveTime) ? prev : [...prev, effectiveTime])
        setError(data.error ?? 'That time was just taken. Please pick another.')
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      router.push(`/book/confirmed?date=${encodeURIComponent(date)}&time=${encodeURIComponent(effectiveTime)}`)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  const noSlots = !loadingSlots && availableSlots.length === 0

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Your name" icon={User}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Jordan Smith"
          autoComplete="name"
          required
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      </Field>

      <Field label="Phone number" icon={Phone} hint="We'll text you a confirmation.">
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+1 416 555 1234"
          autoComplete="tel"
          required
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      </Field>

      <Field label="Email" icon={Mail} hint="Optional — we'll send you a reminder before your appointment.">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="optional"
          autoComplete="email"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      </Field>

      <Field label="Service" icon={ScissorsIcon}>
        <select
          value={service}
          onChange={e => setService(e.target.value)}
          required
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        >
          {services.map(s => (
            <option key={s.name} value={s.name}>
              {s.name} · {formatPrice(s.price_cad)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Date" icon={Calendar}>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
        </Field>

        <Field
          label="Time"
          icon={Clock}
          hint={loadingSlots ? 'Checking availability…' : noSlots ? (daySlots.length === 0 ? 'Shop closed on this day.' : 'No times left for this date.') : undefined}
        >
          <select
            value={effectiveTime}
            onChange={e => setTime(e.target.value)}
            disabled={loadingSlots || noSlots}
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          >
            {loadingSlots ? (
              <option value="">Loading…</option>
            ) : noSlots ? (
              <option value="">No times available</option>
            ) : (
              availableSlots.map(s => (
                <option key={s} value={s}>{formatTimeLabel(s)}</option>
              ))
            )}
          </select>
        </Field>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || loadingSlots || noSlots}
        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-3.5 rounded-xl transition-colors text-sm"
      >
        {submitting ? 'Booking…' : noSlots ? 'Pick another date' : (
          <>
            Book with {shopName}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  )
}

type FieldProps = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  hint?: string
  children: React.ReactNode
}

function Field({ label, icon: Icon, hint, children }: FieldProps) {
  return (
    <label className="block">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          {label}
        </span>
      </div>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </label>
  )
}
