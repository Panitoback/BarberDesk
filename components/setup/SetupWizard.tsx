'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, X, Clock, Scissors, ImageIcon, Bell, Copy } from 'lucide-react'
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  SERVICE_DURATIONS,
  type TenantConfig,
  type Weekday,
  type DayHours,
  type Service,
  type ServiceDuration,
} from '@/lib/tenant-config'

type HoursMap = Partial<Record<Weekday, DayHours>>

const STEPS = [
  { label: 'Hours',     icon: Clock },
  { label: 'Services',  icon: Scissors },
  { label: 'Logo',      icon: ImageIcon },
  { label: 'Reminders', icon: Bell },
  { label: 'Done',      icon: Check },
] as const

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

const DEFAULT_HOURS: HoursMap = {
  mon: { open: '09:00', close: '18:00' },
  tue: { open: '09:00', close: '18:00' },
  wed: { open: '09:00', close: '18:00' },
  thu: { open: '09:00', close: '18:00' },
  fri: { open: '09:00', close: '18:00' },
  sat: { open: '09:00', close: '16:00' },
  sun: null,
}

export default function SetupWizard({
  shopName,
  subdomain,
  initialConfig,
  initialReminderActive,
  initialReminderHours,
}: {
  shopName:              string
  subdomain:             string
  initialConfig:         TenantConfig
  initialReminderActive: boolean
  initialReminderHours:  number
}) {
  const router = useRouter()
  const [step,   setStep]   = useState(0)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // Step 0: Hours
  const [hours, setHours] = useState<HoursMap>(
    Object.keys(initialConfig.hours ?? {}).length > 0 ? initialConfig.hours! : DEFAULT_HOURS
  )

  // Step 1: Services
  const [services, setServices] = useState<Service[]>(
    initialConfig.services?.length ? initialConfig.services : [{ name: '', price_cad: 0, duration_min: 30 }]
  )

  // Step 2: Logo
  const [logoPath,      setLogoPath]      = useState<string | null>(initialConfig.logo_path ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoRef = useRef<HTMLInputElement | null>(null)

  // Step 3: Reminders
  const [reminderActive, setReminderActive] = useState(initialReminderActive)
  const [reminderHours,  setReminderHours]  = useState(String(initialReminderHours))

  const bookingUrl = `https://${subdomain}.barberqueue.pro/book`

  // ── Savers ──────────────────────────────────────────────────────────────────

  async function postSettings(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch('/api/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setError(d.error ?? 'Could not save. Please try again.')
      return false
    }
    return true
  }

  async function saveStep(): Promise<boolean> {
    setSaving(true); setError(null)
    let ok = true

    if (step === 0) {
      ok = await postSettings({ config: { hours } })
    } else if (step === 1) {
      const valid = services.filter(s => s.name.trim().length > 0)
      if (valid.length === 0) { setError('Add at least one service.'); setSaving(false); return false }
      ok = await postSettings({ config: { services: valid } })
    } else if (step === 3) {
      const h = Number(reminderHours)
      if (!Number.isInteger(h) || h < 1 || h > 72) { setError('Hours must be between 1 and 72.'); setSaving(false); return false }
      ok = await postSettings({ reminder_active: reminderActive, reminder_hours: h, config: {} })
    }

    setSaving(false)
    return ok
  }

  async function handleNext() {
    const ok = await saveStep()
    if (ok) setStep(s => s + 1)
  }

  function handleSkip() {
    setError(null)
    setStep(s => s + 1)
  }

  async function finish() {
    setSaving(true)
    await postSettings({ config: { onboarding_done: true } })
    router.push('/')
  }

  async function skipAll() {
    await postSettings({ config: { onboarding_done: true } })
    router.push('/')
  }

  // ── Hours helpers ───────────────────────────────────────────────────────────

  function toggleDay(day: Weekday) {
    setHours(h => ({
      ...h,
      [day]: h[day] ? null : { open: '09:00', close: '18:00' },
    }))
  }

  function setDayTime(day: Weekday, field: 'open' | 'close', value: string) {
    setHours(h => {
      const existing = h[day]
      if (!existing) return h
      return { ...h, [day]: { ...(existing as { open: string; close: string }), [field]: value } }
    })
  }

  // ── Logo upload ─────────────────────────────────────────────────────────────

  async function handleLogoUpload(file: File) {
    setLogoUploading(true); setError(null)
    const fd = new FormData(); fd.append('logo', file)
    const res = await fetch('/api/settings/logo', { method: 'POST', body: fd })
    setLogoUploading(false)
    if (!res.ok) { setError('Could not upload logo.'); return }
    const d = await res.json() as { logo_path?: string }
    if (d.logo_path) setLogoPath(d.logo_path)
  }

  // ── Services helpers ────────────────────────────────────────────────────────

  function updateService(i: number, patch: Partial<Service>) {
    setServices(ss => ss.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  const logoPublicUrl = logoPath
    ? `${SUPABASE_URL}/storage/v1/object/public/tenant-logos/${logoPath}`
    : null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2 shrink-0">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Setting up</p>
          <h1 className="text-lg font-bold text-white">{shopName}</h1>
        </div>
        <button
          type="button"
          onClick={skipAll}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Skip setup
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1.5 px-5 py-4 shrink-0">
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`h-1 rounded-full flex-1 transition-all duration-300 ${
              i < step ? 'bg-indigo-500' : i === step ? 'bg-indigo-400' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center px-5 pb-8">
        <div className="w-full max-w-lg space-y-5">

          {/* ── Step 0: Hours ── */}
          {step === 0 && (
            <>
              <StepHeader step={1} total={STEPS.length} title="Opening hours" subtitle="When is your shop open?" />
              <div className="space-y-2">
                {WEEKDAYS.map(day => {
                  const h    = hours[day]
                  const isOpen = h !== null && h !== undefined
                  return (
                    <div key={day} className="bg-slate-900 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${isOpen ? 'bg-indigo-600' : 'bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isOpen ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      <span className={`text-sm font-medium w-[5.5rem] shrink-0 ${isOpen ? 'text-white' : 'text-slate-600'}`}>
                        {WEEKDAY_LABELS[day]}
                      </span>
                      {isOpen && h ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="time"
                            value={(h as { open: string; close: string }).open}
                            onChange={e => setDayTime(day, 'open', e.target.value)}
                            className="bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-slate-600 text-xs">–</span>
                          <input
                            type="time"
                            value={(h as { open: string; close: string }).close}
                            onChange={e => setDayTime(day, 'close', e.target.value)}
                            className="bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-700 ml-auto">Closed</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Step 1: Services ── */}
          {step === 1 && (
            <>
              <StepHeader step={2} total={STEPS.length} title="Services & prices" subtitle="What do you offer?" />
              <div className="space-y-3">
                {services.map((s, i) => (
                  <div key={i} className="bg-slate-900 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.name}
                        onChange={e => updateService(i, { name: e.target.value })}
                        placeholder="Service name (e.g. Haircut)"
                        maxLength={80}
                        className="flex-1 bg-slate-800 text-white text-sm rounded-lg px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                      {services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setServices(ss => ss.filter((_, idx) => idx !== i))}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1 bg-slate-800 rounded-lg border border-slate-700 px-3 py-2.5 focus-within:border-indigo-500">
                        <span className="text-slate-500 text-sm">$</span>
                        <input
                          type="number"
                          value={s.price_cad === 0 ? '' : s.price_cad}
                          onChange={e => updateService(i, { price_cad: Math.max(0, Number(e.target.value) || 0) })}
                          placeholder="Price CAD"
                          min={0} max={10000} step={1}
                          className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-600 w-0"
                        />
                      </div>
                      <select
                        value={s.duration_min}
                        onChange={e => updateService(i, { duration_min: Number(e.target.value) as ServiceDuration })}
                        className="bg-slate-800 text-white text-sm rounded-lg px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-indigo-500 shrink-0"
                      >
                        {SERVICE_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setServices(ss => [...ss, { name: '', price_cad: 0, duration_min: 30 }])}
                  className="w-full text-sm text-indigo-400 hover:text-indigo-300 border border-dashed border-indigo-900 rounded-xl py-3 transition-colors"
                >
                  + Add service
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Logo ── */}
          {step === 2 && (
            <>
              <StepHeader step={3} total={STEPS.length} title="Shop logo" subtitle="Shown on your booking page. You can skip this and add it later." />
              <div className="flex flex-col items-center gap-5 pt-2">
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center">
                  {logoPublicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPublicUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-700" />
                  )}
                </div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }}
                />
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  disabled={logoUploading}
                  className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {logoUploading ? 'Uploading…' : logoPath ? 'Change logo' : 'Upload logo'}
                </button>
                {logoPath && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Logo uploaded
                  </p>
                )}
                <p className="text-xs text-slate-600">JPEG, PNG or WebP · max 2 MB</p>
              </div>
            </>
          )}

          {/* ── Step 3: Reminders ── */}
          {step === 3 && (
            <>
              <StepHeader step={4} total={STEPS.length} title="Email reminders" subtitle="Automatically remind clients before their appointment." />
              <div className="bg-slate-900 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Send reminder emails</span>
                  <button
                    type="button"
                    onClick={() => setReminderActive(a => !a)}
                    className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors ${reminderActive ? 'bg-indigo-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${reminderActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {reminderActive && (
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-800">
                    <span className="text-sm text-slate-400">Send</span>
                    <input
                      type="number"
                      value={reminderHours}
                      onChange={e => setReminderHours(e.target.value)}
                      min={1} max={72}
                      className="w-16 bg-slate-800 text-white text-sm text-center rounded-lg px-2 py-2 border border-slate-700 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-sm text-slate-400">hours before appointment</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 4: Done ── */}
          {step === 4 && (
            <div className="space-y-6 pt-4">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">You&apos;re all set!</h2>
                  <p className="text-sm text-slate-400 mt-1">Share this link with your clients.</p>
                </div>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-3">Your booking link</p>
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-indigo-300 font-mono truncate">{bookingUrl}</span>
                  <button
                    type="button"
                    onClick={() => { void navigator.clipboard.writeText(bookingUrl) }}
                    className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                    title="Copy link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-center text-slate-500">
                You can always update hours, services and more from <strong className="text-slate-400">Settings</strong>.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Navigation */}
          <div className={`flex items-center pt-2 ${step > 0 && step < 4 ? 'justify-between' : 'justify-end'}`}>
            {step > 0 && step < 4 && (
              <button
                type="button"
                onClick={() => { setError(null); setStep(s => s - 1) }}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-3 py-2.5"
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <div className="flex items-center gap-3">
                {step === 2 && (
                  <button type="button" onClick={handleSkip}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-3 py-2.5">
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
                >
                  {saving ? 'Saving…' : 'Continue'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-colors"
              >
                {saving ? 'Going to dashboard…' : 'Go to dashboard'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Step {step} of {total}</p>
      <h2 className="text-2xl font-bold text-white mt-1">{title}</h2>
      <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
    </div>
  )
}
