'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  type TenantConfig,
  type Weekday,
  type DayHours,
  type Service,
} from '@/lib/tenant-config'

type HoursMap = Partial<Record<Weekday, DayHours>>

export default function SettingsForm({
  initialConfig,
  initialReviewLink,
  initialReminderActive,
  initialReminderHours,
}: {
  initialConfig:        TenantConfig
  initialReviewLink:    string
  initialReminderActive: boolean
  initialReminderHours:  number
}) {
  const router = useRouter()
  const [hours,              setHours]              = useState<HoursMap>(initialConfig.hours ?? {})
  const [services,           setServices]           = useState<Service[]>(initialConfig.services ?? [])
  const [address,            setAddress]            = useState(initialConfig.address ?? '')
  const [notificationEmail,  setNotificationEmail]  = useState(initialConfig.notification_email ?? '')
  const [reviewLink,         setReviewLink]         = useState(initialReviewLink)
  const [reminderActive,     setReminderActive]     = useState(initialReminderActive)
  const [reminderHours,      setReminderHours]      = useState(initialReminderHours)
  const [saving,          setSaving]          = useState(false)
  const [feedback,        setFeedback]        = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function changeDayMode(day: Weekday, mode: 'unset' | 'open' | 'closed') {
    setHours(h => {
      const next = { ...h }
      if (mode === 'unset')      delete next[day]
      else if (mode === 'closed') next[day] = null
      else                        next[day] = h[day] ?? { open: '09:00', close: '18:00' }
      return next
    })
  }

  function setDayTime(day: Weekday, field: 'open' | 'close', value: string) {
    setHours(h => {
      const current = h[day]
      if (!current) return h
      return { ...h, [day]: { ...current, [field]: value } }
    })
  }

  function addService() {
    setServices(s => [...s, { name: '', price_cad: 0 }])
  }

  function updateService(i: number, field: 'name' | 'price_cad', value: string) {
    setServices(s => s.map((svc, idx) => {
      if (idx !== i) return svc
      if (field === 'price_cad') return { ...svc, price_cad: Number(value) || 0 }
      return { ...svc, name: value }
    }))
  }

  function removeService(i: number) {
    setServices(s => s.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const config: TenantConfig = {}
      if (Object.keys(hours).length > 0) config.hours = hours

      const cleanServices = services
        .map(s => ({ name: s.name.trim(), price_cad: s.price_cad }))
        .filter(s => s.name.length > 0)
      if (cleanServices.length > 0) config.services = cleanServices

      const cleanAddress = address.trim()
      if (cleanAddress.length > 0) config.address = cleanAddress

      const cleanNotifEmail = notificationEmail.trim().toLowerCase()
      if (cleanNotifEmail.length > 0) config.notification_email = cleanNotifEmail

      const hours_val = Math.min(72, Math.max(1, Math.round(reminderHours) || 24))

      const res = await fetch('/api/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          config,
          review_link:      reviewLink.trim(),
          reminder_active:  reminderActive,
          reminder_hours:   hours_val,
        }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')

      setFeedback({ type: 'success', text: 'Settings saved.' })
      router.refresh()
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Opening hours */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Opening hours</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Days marked &quot;Not set&quot; tell the AI assistant to say it can&apos;t confirm.
        </p>
        <div className="space-y-3">
          {WEEKDAYS.map(day => {
            const dh = hours[day]
            const mode: 'unset' | 'open' | 'closed' =
              dh === undefined ? 'unset' : dh === null ? 'closed' : 'open'
            return (
              <div
                key={day}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-24 text-sm font-medium text-slate-700">{WEEKDAY_LABELS[day]}</div>
                  <select
                    value={mode}
                    onChange={(e) => changeDayMode(day, e.target.value as 'unset' | 'open' | 'closed')}
                    aria-label={`${WEEKDAY_LABELS[day]} status`}
                    className="text-sm border border-slate-300 rounded-lg px-2 py-2 bg-white min-h-[40px]"
                  >
                    <option value="unset">Not set</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                {mode === 'open' && dh && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="time"
                      value={dh.open}
                      onChange={(e) => setDayTime(day, 'open', e.target.value)}
                      aria-label={`${WEEKDAY_LABELS[day]} opening time`}
                      className="text-sm border border-slate-300 rounded-lg px-2 py-2 min-h-[40px]"
                    />
                    <span className="text-slate-400 text-sm">to</span>
                    <input
                      type="time"
                      value={dh.close}
                      onChange={(e) => setDayTime(day, 'close', e.target.value)}
                      aria-label={`${WEEKDAY_LABELS[day]} closing time`}
                      className="text-sm border border-slate-300 rounded-lg px-2 py-2 min-h-[40px]"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Services */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Services &amp; prices</h2>
            <p className="text-sm text-slate-500 mt-1">
              The AI will only quote prices listed here.
            </p>
          </div>
          <button
            onClick={addService}
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 shrink-0 px-2 py-1 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No services configured.</p>
        ) : (
          <div className="space-y-3 sm:space-y-2">
            {services.map((svc, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2"
              >
                <input
                  type="text"
                  value={svc.name}
                  onChange={(e) => updateService(i, 'name', e.target.value)}
                  placeholder="Service name (e.g. Classic Haircut)"
                  maxLength={80}
                  aria-label={`Service ${i + 1} name`}
                  className="flex-1 min-w-0 text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]"
                />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1 sm:flex-none">
                    <span className="text-slate-500 text-sm">$</span>
                    <input
                      type="number"
                      value={svc.price_cad}
                      onChange={(e) => updateService(i, 'price_cad', e.target.value)}
                      min="0"
                      max="10000"
                      step="0.01"
                      inputMode="decimal"
                      aria-label={`Service ${i + 1} price`}
                      className="w-24 sm:w-20 text-sm border border-slate-300 rounded-lg px-2 py-2 min-h-[40px]"
                    />
                    <span className="text-slate-500 text-sm">CAD</span>
                  </div>
                  <button
                    onClick={() => removeService(i)}
                    type="button"
                    aria-label={`Remove service ${i + 1}`}
                    className="text-slate-400 hover:text-red-600 p-2 rounded-lg shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Address */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Address</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Quoted verbatim when clients ask where you are.
        </p>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Queen St W, Toronto, ON"
          maxLength={200}
          aria-label="Shop address"
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]"
        />
      </section>

      {/* Notification email */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Notification email</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          You&apos;ll receive an email here every time a client books online.
        </p>
        <input
          type="email"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={200}
          aria-label="Notification email"
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]"
        />
      </section>

      {/* Google review link */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Google review link</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Sent in the review-request SMS after a completed appointment. Paste the short link from
          your Google Business profile (e.g. <span className="font-mono text-xs">https://g.page/r/…</span>).
        </p>
        <input
          type="url"
          value={reviewLink}
          onChange={(e) => setReviewLink(e.target.value)}
          placeholder="https://g.page/r/your-shop/review"
          maxLength={500}
          aria-label="Google review link"
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]"
        />
      </section>

      {/* Appointment reminder */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Appointment reminder</h2>
            <p className="text-sm text-slate-500 mt-1">
              Automatic SMS sent to clients before their appointment.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reminderActive}
            onClick={() => setReminderActive(v => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              reminderActive ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                reminderActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <div className={`flex items-center gap-3 ${!reminderActive ? 'opacity-40 pointer-events-none' : ''}`}>
          <label htmlFor="reminder-hours" className="text-sm text-slate-700 whitespace-nowrap">
            Send reminder
          </label>
          <input
            id="reminder-hours"
            type="number"
            min={1}
            max={72}
            step={1}
            value={reminderHours}
            onChange={e => setReminderHours(Number(e.target.value) || 24)}
            className="w-20 text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px] text-center"
          />
          <span className="text-sm text-slate-700">hours before</span>
        </div>
      </section>

      {/* Save bar */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {feedback ? (
          <p
            role="status"
            className={`text-sm ${feedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}
          >
            {feedback.text}
          </p>
        ) : <span className="hidden sm:block" />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
