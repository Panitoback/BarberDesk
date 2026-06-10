'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, Clock, User, Phone, Mail, Scissors as ScissorsIcon,
  ArrowRight, StickyNote, CreditCard, Bell, Camera, X, ChevronLeft,
} from 'lucide-react'
import Image from 'next/image'
import type { Service } from '@/lib/tenant-config'
import { formatPriceModifier } from '@/lib/barbers'

type BarberOption = {
  id: string
  name: string
  photo_url: string | null
  bio: string | null
  price_modifier: number
  instagram_handle: string | null
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
}

function looksLikePhone(p: string): boolean {
  return p.replace(/\D/g, '').length >= 10
}

// ── Step indicator ────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === step
              ? 'w-6 h-2 bg-indigo-600'
              : i + 1 < step
              ? 'w-2 h-2 bg-indigo-300'
              : 'w-2 h-2 bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

// ── Step labels ───────────────────────────────────────────────────────
const STEP_LABELS = ['Your info', 'Service', 'Date & time', 'Final details']

export default function BookingForm({ services, shopName, depositActive = false, depositAmountCad = 20 }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 4

  // Form fields
  const [name, setName]             = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')
  const [service, setService]       = useState(services[0]?.name ?? '')
  const [date, setDate]             = useState(todayISO())
  const [time, setTime]             = useState('')
  const [clientNote, setClientNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Photo upload
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Waitlist
  const [waitlistOpen,       setWaitlistOpen]       = useState(false)
  const [waitlistDone,       setWaitlistDone]        = useState(false)
  const [waitlistSubmitting, setWaitlistSubmitting]  = useState(false)
  const [waitlistError,      setWaitlistError]       = useState<string | null>(null)

  // Barbers
  const [barbers,       setBarbers]       = useState<BarberOption[]>([])
  const [barberId,      setBarberId]      = useState<string>('any')
  const [barbersLoaded, setBarbersLoaded] = useState(false)
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slots
  const [daySlots,     setDaySlots]     = useState<string[]>([])
  const [takenForDate, setTakenForDate] = useState<string>('')

  const minDate          = useMemo(() => todayISO(), [])
  const selectedDuration = useMemo(
    () => services.find(s => s.name === service)?.duration_min ?? 30,
    [services, service],
  )
  const fetchKey    = `${date}|${selectedDuration}|${barberId}`
  const loadingSlots = takenForDate !== fetchKey

  const availableSlots = useMemo(() => {
    if (loadingSlots) return [] satisfies string[]
    const isToday = date === minDate
    const cutoff  = isToday ? nowMinutes() : -1
    return daySlots.filter(s => slotMinutes(s) > cutoff)
  }, [date, minDate, daySlots, loadingSlots])

  const effectiveTime = availableSlots.includes(time) ? time : (availableSlots[0] ?? '')

  const selectedBarber  = barbers.find(b => b.id === barberId)
  const selectedService = services.find(s => s.name === service)
  const activeModifier  = selectedBarber?.price_modifier ?? 1
  const basePrice       = selectedService?.price_cad ?? 0
  const finalPrice      = activeModifier !== 1 ? Math.round(basePrice * activeModifier * 100) / 100 : null

  const noSlots    = !loadingSlots && availableSlots.length === 0
  const hasBarbers = barbersLoaded && barbers.length > 0

  // Load barbers
  useEffect(() => {
    fetch('/api/book/barbers', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { barbers: [] })
      .then((d: { barbers?: BarberOption[] }) => {
        setBarbers(Array.isArray(d.barbers) ? d.barbers : [])
        setBarbersLoaded(true)
      })
      .catch(() => setBarbersLoaded(true))
  }, [])

  // Preferred barber from phone
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
    return () => { if (phoneDebounce.current) clearTimeout(phoneDebounce.current) }
  }, [phone, barbersLoaded, barbers])

  // Fetch slots
  useEffect(() => {
    let cancelled = false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const barberParam = barberId !== 'any' ? `&barber_id=${encodeURIComponent(barberId)}` : `&barber_id=any`
    fetch(`/api/book/slots?date=${encodeURIComponent(date)}&duration=${selectedDuration}${barberParam}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { taken: [], slots: [] })
      .then((data: { taken?: string[]; slots?: string[] }) => {
        if (cancelled) return
        setDaySlots(Array.isArray(data.slots) ? data.slots : [])
        setTakenForDate(fetchKey)
      })
      .catch(() => { if (!cancelled) { setDaySlots([]); setTakenForDate(fetchKey) } })
    return () => { cancelled = true }
  }, [date, selectedDuration, barberId, fetchKey])

  // Photo preview
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  // Navigation validation
  function canProceed(): boolean {
    if (step === 1) return name.trim().length >= 2 && looksLikePhone(phone)
    if (step === 3) return !loadingSlots && !!effectiveTime
    return true
  }

  function handleNext() {
    if (!canProceed()) {
      if (step === 1) setError('Please enter your name and a valid phone number.')
      if (step === 3) setError('Please pick an available time.')
      return
    }
    setError(null)
    setStep(s => Math.min(s + 1, TOTAL_STEPS))
  }

  function handleBack() {
    setError(null)
    setStep(s => Math.max(s - 1, 1))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canProceed()) return
    setError(null)
    setSubmitting(true)

    try {
      // Upload photo if one was selected
      let haircutPhotoUrl: string | undefined
      if (photoFile) {
        setPhotoUploading(true)
        const fd = new FormData()
        fd.append('file', photoFile)
        const uploadRes = await fetch('/api/book/photo', { method: 'POST', body: fd })
        setPhotoUploading(false)
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json() as { url?: string }
          haircutPhotoUrl = uploadData.url
        }
        // Photo upload failure is non-fatal — booking proceeds without it
      }

      const res = await fetch('/api/book', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              name.trim(),
          phone:             phone.trim(),
          email:             email.trim() || undefined,
          service,
          date,
          time:              effectiveTime,
          client_note:       clientNote.trim() || undefined,
          barber_id:         barberId,
          haircut_photo_url: haircutPhotoUrl,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409) {
        setTakenForDate('')
        setError(data.error ?? 'That time was just taken. Please pick another.')
        setStep(3)
        setSubmitting(false)
        return
      }
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
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

  async function handleWaitlistSubmit() {
    if (!name.trim() || !phone.trim()) { setWaitlistError('Fill in your name and phone first.'); return }
    setWaitlistSubmitting(true)
    setWaitlistError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), service, date }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setWaitlistError((data as { error?: string }).error ?? 'Could not join the waitlist.'); return }
      setWaitlistDone(true)
    } catch {
      setWaitlistError('Network error. Please try again.')
    } finally { setWaitlistSubmitting(false) }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col" style={{ minHeight: 'clamp(460px, calc(100svh - 160px), 680px)' }}>

      {/* Step indicator */}
      <div className="shrink-0">
        <StepDots step={step} total={TOTAL_STEPS} />
        <p className="text-center text-xs font-medium text-slate-500 mb-4">
          Step {step} of {TOTAL_STEPS} — <span className="text-slate-700">{STEP_LABELS[step - 1]}</span>
        </p>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">

        {/* ── Step 1: Who are you? ── */}
        {step === 1 && (
          <>
            <Field label="Your name" icon={User}>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Jordan Smith" autoComplete="name" required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </Field>
            <Field label="Phone number" icon={Phone} hint="We'll text you a confirmation.">
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+1 416 555 1234" autoComplete="tel" required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </Field>
            <Field label="Email" icon={Mail} hint="Optional — for appointment reminders.">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="optional" autoComplete="email"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </Field>
          </>
        )}

        {/* ── Step 2: Service + Barber ── */}
        {step === 2 && (
          <>
            <Field label="Service" icon={ScissorsIcon}>
              <select
                value={service} onChange={e => setService(e.target.value)} required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
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

            {hasBarbers && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ScissorsIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Choose your barber</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <BarberCard id="any" name="Any available" photoUrl={null} bio="First available barber"
                    priceHint="" selected={barberId === 'any'} onSelect={() => setBarberId('any')} />
                  {barbers.map(b => (
                    <BarberCard key={b.id} id={b.id} name={b.name} photoUrl={b.photo_url} bio={b.bio}
                      priceHint={formatPriceModifier(b.price_modifier)} instagramHandle={b.instagram_handle}
                      selected={barberId === b.id} onSelect={() => setBarberId(b.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step 3: Date + Time ── */}
        {step === 3 && (
          <>
            <Field label="Date" icon={Calendar}>
              <input
                type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)} required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </Field>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Available times</span>
                {loadingSlots && <span className="text-xs text-slate-400 ml-auto">Checking…</span>}
              </div>

              {noSlots ? (
                <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                  {daySlots.length === 0 ? 'Shop is closed on this day.' : 'No times left for this date.'}
                </p>
              ) : loadingSlots ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {availableSlots.map(slot => (
                    <button
                      key={slot} type="button" onClick={() => setTime(slot)}
                      className={`py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                        effectiveTime === slot
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {formatTimeLabel(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Waitlist */}
            {!loadingSlots && (
              <div className="border-t border-slate-100 pt-3">
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
                  <button type="button" onClick={() => setWaitlistOpen(true)}
                    className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
                    Don&apos;t see the time you want? Join the{' '}
                    <span className="text-indigo-600 underline underline-offset-2">waitlist</span>
                  </button>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-700">Join the waitlist</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      We&apos;ll text you as soon as a spot opens for <strong>{service}</strong> on <strong>{date}</strong>.
                    </p>
                    {waitlistError && <p className="text-xs text-red-600">{waitlistError}</p>}
                    <button type="button" onClick={handleWaitlistSubmit} disabled={waitlistSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                      {waitlistSubmitting ? 'Joining…' : <><Bell className="w-3.5 h-3.5" /> Notify me</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Final details ── */}
        {step === 4 && (
          <>
            {/* Booking summary */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-medium text-slate-800">{service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-800">{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-medium text-slate-800">{formatTimeLabel(effectiveTime)}</span>
              </div>
              {selectedBarber && barberId !== 'any' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Barber</span>
                  <span className="font-medium text-slate-800">{selectedBarber.name}</span>
                </div>
              )}
            </div>

            <Field label="Notes for the barber" icon={StickyNote} hint="Optional — allergies, preferences, anything they should know.">
              <textarea
                value={clientNote} onChange={e => setClientNote(e.target.value.slice(0, 500))}
                placeholder="optional" rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              />
            </Field>

            {/* Haircut photo */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Reference photo
                </span>
                <span className="text-xs text-slate-400 ml-1">optional</span>
              </div>

              {photoPreview ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={photoPreview} alt="Haircut reference" className="w-full h-full object-cover" />
                  <button
                    type="button" onClick={removePhoto}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 px-3 py-2">
                    <p className="text-white text-xs">Your barber will see this photo</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button" onClick={() => photoInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-xl py-6 flex flex-col items-center gap-2 transition-colors text-slate-400 hover:text-indigo-500"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-sm font-medium">Add a photo of the cut you want</span>
                  <span className="text-xs">Tap to choose from camera or gallery</span>
                </button>
              )}
              <input
                ref={photoInputRef} type="file" accept="image/*" className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {depositActive && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Deposit of ${depositAmountCad} CAD required</p>
                  <p className="text-xs text-indigo-600 mt-0.5">You&apos;ll be taken to Stripe to pay. Applied toward your service.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 mt-3">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="shrink-0 flex gap-3 mt-4 pt-3 border-t border-slate-100">
        {step > 1 && (
          <button
            type="button" onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button" onClick={handleNext}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting || loadingSlots || noSlots}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {submitting
              ? (photoUploading ? 'Uploading photo…' : depositActive ? 'Redirecting to payment…' : 'Booking…')
              : depositActive
              ? <><CreditCard className="w-4 h-4" /> Pay deposit &amp; confirm</>
              : <>Book with {shopName} <ArrowRight className="w-4 h-4" /></>
            }
          </button>
        )}
      </div>
    </form>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function BarberCard({ id, name, photoUrl, bio, priceHint, instagramHandle, selected, onSelect }: {
  id: string; name: string; photoUrl: string | null; bio: string | null
  priceHint: string; instagramHandle?: string | null; selected: boolean; onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all ${
        selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
      }`}
    >
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
        <p className={`text-xs font-semibold truncate ${selected ? 'text-indigo-700' : 'text-slate-800'}`}>{name}</p>
        {bio && <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{bio}</p>}
        {priceHint && (
          <span className={`inline-block mt-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
            priceHint.startsWith('+') ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
          }`}>Prices {priceHint}</span>
        )}
        {instagramHandle && (
          <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-1 text-xs text-pink-600 hover:text-pink-500 transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            @{instagramHandle}
          </a>
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
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</span>
      </div>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </label>
  )
}
