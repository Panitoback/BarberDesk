'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, Phone, Mail, Scissors as ScissorsIcon, ArrowRight, StickyNote, CreditCard, Bell } from 'lucide-react'
import Image from 'next/image'
import type { Service } from '@/lib/tenant-config'
import { formatPriceModifier } from '@/lib/barbers'

type BarberOption = {
  id: string
  name: string
  photo_url: string | null
  bio: string | null
  price_modifier: number
}

type Props = {
  services:          Service[]
  shopName:          string
  depositActive?:    boolean
  depositAmountCad?: number
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

function looksLikePhone(p: string): boolean {
  return p.replace(/\D/g, '').length >= 10
}

export default function BookingForm({ services, shopName, depositActive = false, depositAmountCad = 20 }: Props) {
  const router = useRouter()
  const [name, setName]             = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')
  const [service, setService]       = useState(services[0]?.name ?? '')
  const [date, setDate]             = useState(todayISO())
  const [time, setTime]             = useState('')
  const [clientNote, setClientNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Waitlist state
  const [waitlistOpen,        setWaitlistOpen]        = useState(false)
  const [waitlistDone,        setWaitlistDone]        = useState(false)
  const [waitlistSubmitting,  setWaitlistSubmitting]  = useState(false)
  const [waitlistError,       setWaitlistError]       = useState<string | null>(null)

  // Barber picker state
  const [barbers, setBarbers]         = useState<BarberOption[]>([])
  const [barberId, setBarberId]       = useState<string>('any')
  const [barbersLoaded, setBarbersLoaded] = useState(false)
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slots state
  const [daySlots, setDaySlots]         = useState<string[]>([])
  const [takenForDate, setTakenForDate] = useState<string>('')

  const minDate = useMemo(() => todayISO(), [])
  const selectedDuration = useMemo(
    () => services.find(s => s.name === service)?.duration_min ?? 30,
    [services, service],
  )
  const fetchKey    = `${date}|${selectedDuration}|${barberId}`
  const loadingSlots = takenForDate !== fetchKey

  const availableSlots = useMemo(() => {
    if (loadingSlots) return [] satisfies string[]
    const isToday = date === minDate
    const cutoff = isToday ? nowMinutes() : -1
    return daySlots.filter(s => slotMinutes(s) > cutoff)
  }, [date, minDate, daySlots, loadingSlots])

  const effectiveTime = availableSlots.includes(time)
    ? time
    : (availableSlots[0] ?? '')

  // Price info for selected barber + service
  const selectedBarber    = barbers.find(b => b.id === barberId)
  const selectedService   = services.find(s => s.name === service)
  const activeModifier    = selectedBarber?.price_modifier ?? 1
  const basePrice         = selectedService?.price_cad ?? 0
  const finalPrice        = activeModifier !== 1
    ? Math.round(basePrice * activeModifier * 100) / 100
    : null // null = no adjustment, don't show

  // Load barbers on mount
  useEffect(() => {
    fetch('/api/book/barbers', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { barbers: [] })
      .then((d: { barbers?: BarberOption[] }) => {
        setBarbers(Array.isArray(d.barbers) ? d.barbers : [])
        setBarbersLoaded(true)
      })
      .catch(() => setBarbersLoaded(true))
  }, [])

  // When phone changes, debounce and fetch preferred barber
  useEffect(() => {
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current)
    if (!looksLikePhone(phone) || !barbersLoaded || barbers.length === 0) return

    phoneDebounce.current = setTimeout(() => {
      fetch(`/api/book/client-preference?phone=${encodeURIComponent(phone)}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { preferred_barber_id: null })
        .then((d: { preferred_barber_id?: string | null }) => {
          if (d.preferred_barber_id && barbers.some(b => b.id === d.preferred_barber_id)) {
            setBarberId(d.preferred_barber_id)
          }
        })
        .catch(() => {})
    }, 700)

    return () => {
      if (phoneDebounce.current) clearTimeout(phoneDebounce.current)
    }
  }, [phone, barbersLoaded, barbers])

  // Fetch slots
  useEffect(() => {
    let cancelled = false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return

    const barberParam = barberId !== 'any' ? `&barber_id=${encodeURIComponent(barberId)}` : `&barber_id=any`
    fetch(
      `/api/book/slots?date=${encodeURIComponent(date)}&duration=${selectedDuration}${barberParam}`,
      { cache: 'no-store' },
    )
      .then(r => r.ok ? r.json() : { taken: [], slots: [] })
      .then((data: { taken?: string[]; slots?: string[] }) => {
        if (cancelled) return
        setDaySlots(Array.isArray(data.slots) ? data.slots : [])
        setTakenForDate(fetchKey)
      })
      .catch(() => {
        if (cancelled) return
        setDaySlots([])
        setTakenForDate(fetchKey)
      })

    return () => { cancelled = true }
  }, [date, selectedDuration, barberId, fetchKey])

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
          name:        name.trim(),
          phone:       phone.trim(),
          email:       email.trim() || undefined,
          service,
          date,
          time:        effectiveTime,
          client_note: clientNote.trim() || undefined,
          barber_id:   barberId,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409) {
        // Remove the conflicting slot from the picker by re-fetching
        setTakenForDate('')
        setError(data.error ?? 'That time was just taken. Please pick another.')
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      // Deposit flow: redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }

      router.push(`/book/confirmed?date=${encodeURIComponent(date)}&time=${encodeURIComponent(effectiveTime)}`)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }


  const noSlots    = !loadingSlots && availableSlots.length === 0
  const hasBarbers = barbersLoaded && barbers.length > 0

  async function handleWaitlistSubmit() {
    if (!name.trim() || !phone.trim()) {
      setWaitlistError('Fill in your name and phone above first.')
      return
    }
    setWaitlistSubmitting(true)
    setWaitlistError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), phone: phone.trim(), service, date }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setWaitlistError((data as { error?: string }).error ?? 'Could not join the waitlist.')
        return
      }
      setWaitlistDone(true)
    } catch {
      setWaitlistError('Network error. Please try again.')
    } finally {
      setWaitlistSubmitting(false)
    }
  }

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

      {/* Barber picker — only shown when shop has barbers configured */}
      {hasBarbers && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ScissorsIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Choose your barber</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Any available card */}
            <BarberCard
              id="any"
              name="Any available"
              photoUrl={null}
              bio="First available barber"
              priceHint=""
              selected={barberId === 'any'}
              onSelect={() => setBarberId('any')}
            />
            {barbers.map(b => (
              <BarberCard
                key={b.id}
                id={b.id}
                name={b.name}
                photoUrl={b.photo_url}
                bio={b.bio}
                priceHint={formatPriceModifier(b.price_modifier)}
                selected={barberId === b.id}
                onSelect={() => setBarberId(b.id)}
              />
            ))}
          </div>
        </div>
      )}

      <Field label="Service" icon={ScissorsIcon}>
        <select
          value={service}
          onChange={e => setService(e.target.value)}
          required
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        >
          {services.map(s => (
            <option key={s.name} value={s.name}>
              {s.name} · {formatPrice(s.price_cad)} + Tax
            </option>
          ))}
        </select>
        {finalPrice !== null && selectedBarber && (
          <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            Price with <strong>{selectedBarber.name}</strong>:{' '}
            <strong>{formatPrice(finalPrice)} + Tax</strong>{' '}
            <span className="text-amber-500">(base {formatPrice(basePrice)}, {formatPriceModifier(activeModifier)})</span>
          </p>
        )}
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

      <Field
        label="Notes for the barber"
        icon={StickyNote}
        hint="Optional — allergies, preferences, anything they should know."
      >
        <textarea
          value={clientNote}
          onChange={e => setClientNote(e.target.value.slice(0, 500))}
          placeholder="optional"
          rows={2}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-y"
        />
      </Field>

      {depositActive && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-start gap-3">
          <CreditCard className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-800">
              A deposit of ${depositAmountCad} CAD is required
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              You&apos;ll be taken to a secure Stripe page to pay. The deposit is applied toward your service.
            </p>
          </div>
        </div>
      )}

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
        {submitting
          ? (depositActive ? 'Redirecting to payment…' : 'Booking…')
          : noSlots
          ? 'Pick another date'
          : depositActive
          ? <>Pay deposit &amp; confirm <CreditCard className="w-4 h-4" /></>
          : <>Book with {shopName} <ArrowRight className="w-4 h-4" /></>
        }
      </button>

      {/* ── Waitlist ── */}
      <div className="border-t border-slate-200 pt-4">
        {waitlistDone ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3">
            <Bell className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">You&apos;re on the waitlist!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                We&apos;ll text you when a spot opens for <strong>{service}</strong> on <strong>{date}</strong>.
              </p>
            </div>
          </div>
        ) : !waitlistOpen ? (
          <button
            type="button"
            onClick={() => setWaitlistOpen(true)}
            className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            Don&apos;t see the time you want?{' '}
            <span className="underline underline-offset-2">Join the waitlist</span>
          </button>
        ) : (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Join the waitlist</p>
            </div>
            <p className="text-xs text-slate-500">
              We&apos;ll text you as soon as a spot opens up for{' '}
              <strong>{service}</strong> on <strong>{date}</strong>.
            </p>
            {waitlistError && (
              <p className="text-xs text-red-600">{waitlistError}</p>
            )}
            <button
              type="button"
              onClick={handleWaitlistSubmit}
              disabled={waitlistSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              {waitlistSubmitting ? 'Joining…' : <>Notify me <Bell className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        )}
      </div>
    </form>
  )
}

function BarberCard({
  id,
  name,
  photoUrl,
  bio,
  priceHint,
  selected,
  onSelect,
}: {
  id: string
  name: string
  photoUrl: string | null
  bio: string | null
  priceHint: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
      }`}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
        {photoUrl ? (
          <Image src={photoUrl} alt={name} width={48} height={48} className="object-cover w-full h-full" />
        ) : (
          <span className="text-lg font-bold text-slate-400">
            {id === 'any' ? '✂' : name[0]?.toUpperCase() ?? '?'}
          </span>
        )}
      </div>

      <div className="min-w-0 w-full">
        <p className={`text-xs font-semibold truncate ${selected ? 'text-indigo-700' : 'text-slate-800'}`}>
          {name}
        </p>
        {bio && (
          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{bio}</p>
        )}
        {priceHint && (
          <span className={`inline-block mt-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
            priceHint.startsWith('+') ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
          }`}>
            Prices {priceHint}
          </span>
        )}
      </div>
    </button>
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
