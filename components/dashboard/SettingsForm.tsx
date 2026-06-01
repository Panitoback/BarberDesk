'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Plus, Trash2, Copy, RefreshCw, Menu, ChevronDown } from 'lucide-react'
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
import { useRef } from 'react'
import BarbersTab from './BarbersTab'
import GalleryTab from './settings/GalleryTab'
import type { Barber } from '@/lib/barbers'
import type { GalleryPhoto } from '@/lib/gallery'
import { THEMES, DEFAULT_THEME, type ThemeId } from '@/lib/theme'

type HoursMap = Partial<Record<Weekday, DayHours>>
type BarberRow = Omit<Barber, 'hours'> & { hours: unknown }

const ALL_TABS = [
  { id: 'general',   label: 'General' },
  { id: 'services',  label: 'Services' },
  { id: 'barbers',   label: 'Barbers', requiresMultiBarber: true },
  { id: 'reminders', label: 'Reminders' },
  { id: 'gallery',   label: 'Gallery' },
] as const
type TabId = typeof ALL_TABS[number]['id']

export default function SettingsForm({
  initialConfig,
  initialReviewLink,
  initialReminderActive,
  initialReminderHours,
  initialFlashDiscountPct,
  initialBarbers,
  multiBarber,
  staffToken,
  subdomain,
  hasStripeKey            = false,
  hasStripeWebhookSecret  = false,
  initialGallery          = [],
  initialLogoUrl          = null,
}: {
  initialConfig:           TenantConfig
  initialReviewLink:       string
  initialReminderActive:   boolean
  initialReminderHours:    number
  initialFlashDiscountPct: number
  initialBarbers:          BarberRow[]
  multiBarber:             boolean
  staffToken:              string | null
  subdomain:               string
  hasStripeKey?:           boolean
  hasStripeWebhookSecret?: boolean
  initialGallery?:         GalleryPhoto[]
  initialLogoUrl?:         string | null
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const tabs = ALL_TABS.filter(t => !('requiresMultiBarber' in t) || multiBarber)
  const activeTab = (params.get('tab') ?? 'general') as TabId

  const [hours,             setHours]             = useState<HoursMap>(initialConfig.hours ?? {})
  const [services,          setServices]          = useState<Service[]>(initialConfig.services ?? [])
  const [address,           setAddress]           = useState(initialConfig.address ?? '')
  const [notificationEmail, setNotificationEmail] = useState(initialConfig.notification_email ?? '')
  const [paymentMode, setPaymentMode] = useState<'none' | 'deposit' | 'full'>(
    initialConfig.full_payment_active ? 'full' : initialConfig.deposit_active ? 'deposit' : 'none'
  )
  const [depositAmount,     setDepositAmount]     = useState(String(initialConfig.deposit_amount_cad ?? 20))
  const [stripeKey,         setStripeKey]         = useState('')
  const [stripeWebhook,     setStripeWebhook]     = useState('')
  const [reviewLink,        setReviewLink]        = useState(initialReviewLink)
  const [reminderActive,    setReminderActive]    = useState(initialReminderActive)
  const [reminderHours,     setReminderHours]     = useState(initialReminderHours)
  const [flashDiscountPct,  setFlashDiscountPct]  = useState(initialFlashDiscountPct)
  const [brandTheme,     setBrandTheme]     = useState<ThemeId>((initialConfig.brand_theme as ThemeId) ?? DEFAULT_THEME)
  const [logoUrl,        setLogoUrl]        = useState<string | null>(initialLogoUrl)
  const [logoUploading,  setLogoUploading]  = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [feedback,       setFeedback]       = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currentToken,   setCurrentToken]   = useState(staffToken)
  const [regenerating,   setRegenerating]   = useState(false)
  const [copied,         setCopied]         = useState(false)

  const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
  const protocol     = isProduction ? 'https' : 'http'
  const staffUrl     = currentToken
    ? `${protocol}://${subdomain}.${isProduction ? 'barberqueue.pro' : 'localhost:3000'}/staff/${currentToken}`
    : null

  async function handleCopy() {
    if (!staffUrl) return
    await navigator.clipboard.writeText(staffUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    if (!confirm('Regenerate the staff link? The old link will stop working immediately.')) return
    setRegenerating(true)
    try {
      const res  = await fetch('/api/settings/staff-token', { method: 'POST' })
      const json = await res.json() as { staff_token?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setCurrentToken(json.staff_token ?? null)
    } catch {
      setFeedback({ type: 'error', text: 'Could not regenerate staff link.' })
    } finally {
      setRegenerating(false)
    }
  }

  function setTab(id: TabId) {
    const next = new URLSearchParams(params.toString())
    next.set('tab', id)
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
    setFeedback(null)
  }

  function changeDayMode(day: Weekday, mode: 'unset' | 'open' | 'closed') {
    setHours(h => {
      const next = { ...h }
      if (mode === 'unset')       delete next[day]
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
    setServices(s => [...s, { name: '', price_cad: 0, duration_min: 30 }])
  }

  function updateService(i: number, field: 'name' | 'price_cad' | 'duration_min', value: string) {
    setServices(s => s.map((svc, idx) => {
      if (idx !== i) return svc
      if (field === 'price_cad')    return { ...svc, price_cad: Number(value) || 0 }
      if (field === 'duration_min') return { ...svc, duration_min: (Number(value) || 30) as ServiceDuration }
      return { ...svc, name: value }
    }))
  }

  function removeService(i: number) {
    setServices(s => s.filter((_, idx) => idx !== i))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLogoUploading(true)
    setFeedback(null)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res  = await fetch('/api/settings/logo', { method: 'POST', body: fd })
      const json = await res.json() as { logo_path?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      // Build public URL from path
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
      setLogoUrl(`${base}/storage/v1/object/public/tenant-logos/${json.logo_path}`)
      setFeedback({ type: 'success', text: 'Logo updated.' })
      router.refresh() // sync sidebar logo
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleLogoRemove() {
    if (!confirm('Remove your shop logo?')) return
    setLogoUploading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/settings/logo', { method: 'DELETE' })
      if (!res.ok) throw new Error('Remove failed')
      setLogoUrl(null)
      setFeedback({ type: 'success', text: 'Logo removed.' })
      router.refresh() // sync sidebar logo
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Remove failed' })
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const config: TenantConfig = {}
      if (Object.keys(hours).length > 0) config.hours = hours

      const cleanServices = services
        .map(s => ({ name: s.name.trim(), price_cad: s.price_cad, duration_min: s.duration_min }))
        .filter(s => s.name.length > 0)
      if (cleanServices.length > 0) config.services = cleanServices

      const cleanAddress = address.trim()
      if (cleanAddress.length > 0) config.address = cleanAddress

      const cleanNotifEmail = notificationEmail.trim().toLowerCase()
      if (cleanNotifEmail.length > 0) config.notification_email = cleanNotifEmail

      config.brand_theme        = brandTheme
      config.deposit_active      = paymentMode === 'deposit'
      config.full_payment_active = paymentMode === 'full'
      const parsedDeposit        = parseFloat(depositAmount)
      config.deposit_amount_cad  = isFinite(parsedDeposit) && parsedDeposit > 0 ? parsedDeposit : 20

      const hours_val = Math.min(72, Math.max(1, Math.round(reminderHours) || 24))
      const pct       = Math.min(100, Math.max(1, Math.round(flashDiscountPct) || 20))

      const body: Record<string, unknown> = {
        config,
        review_link:        reviewLink.trim(),
        reminder_active:    reminderActive,
        reminder_hours:     hours_val,
        flash_discount_pct: pct,
      }
      if (stripeKey.trim())     body.stripe_secret_key     = stripeKey.trim()
      if (stripeWebhook.trim()) body.stripe_webhook_secret = stripeWebhook.trim()

      const res = await fetch('/api/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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

  const tabClass = (id: TabId) =>
    `px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
      activeTab === id
        ? 'bg-indigo-600 text-white'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`

  const hasSaveBar = activeTab === 'general' || activeTab === 'services' || activeTab === 'reminders'

  return (
    <div className="space-y-6">
      {/* Sticky tab bar + save button */}
      <div className="sticky top-16 md:top-0 z-20 bg-slate-50 pt-1 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {/* Mobile: hamburger dropdown */}
          <div className="relative flex-1 min-w-0 md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-4 h-4 shrink-0 text-slate-500" />
              <span className="flex-1 text-left">{tabs.find(t => t.id === activeTab)?.label}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
                  {tabs.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setTab(t.id); setMenuOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                        t.id === activeTab
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Desktop: pill tabs */}
          <div className="hidden md:flex flex-1 gap-1 bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto min-w-0">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={tabClass(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {hasSaveBar && (
            <div className="flex items-center gap-3 shrink-0">
              {feedback && (
                <p role="status" className={`text-sm hidden sm:block ${feedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {feedback.text}
                </p>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* General tab */}
      {activeTab === 'general' && (
        <>
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
                  <div key={day} className="flex items-center gap-1.5">
                    <span className="w-[4.5rem] shrink-0 text-sm font-medium text-slate-700">{WEEKDAY_LABELS[day]}</span>
                    <select
                      value={mode}
                      onChange={(e) => changeDayMode(day, e.target.value as 'unset' | 'open' | 'closed')}
                      aria-label={`${WEEKDAY_LABELS[day]} status`}
                      className="text-sm border border-slate-300 rounded-lg px-2 py-2 bg-white min-h-[40px] w-[5.5rem] shrink-0"
                    >
                      <option value="unset">Not set</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                    {mode === 'open' && dh && (
                      <>
                        <input
                          type="time"
                          value={dh.open}
                          onChange={(e) => setDayTime(day, 'open', e.target.value)}
                          aria-label={`${WEEKDAY_LABELS[day]} opening time`}
                          className="text-sm border border-slate-300 rounded-lg px-2 py-2 min-h-[40px] flex-1 min-w-0"
                        />
                        <span className="text-slate-400 text-sm shrink-0">–</span>
                        <input
                          type="time"
                          value={dh.close}
                          onChange={(e) => setDayTime(day, 'close', e.target.value)}
                          aria-label={`${WEEKDAY_LABELS[day]} closing time`}
                          className="text-sm border border-slate-300 rounded-lg px-2 py-2 min-h-[40px] flex-1 min-w-0"
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
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

          {/* Online booking payment */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Online booking payment</h2>
            <p className="text-sm text-slate-500 mb-4">
              Optionally require clients to pay via Stripe when they book online. Requires your Stripe account below.
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="paymentMode" value="none"
                  checked={paymentMode === 'none'}
                  onChange={() => setPaymentMode('none')}
                  className="mt-0.5 accent-indigo-600" />
                <div>
                  <span className="text-sm font-medium text-slate-900">No prepayment</span>
                  <p className="text-xs text-slate-500 mt-0.5">Clients book for free — you collect at the appointment.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="paymentMode" value="deposit"
                  checked={paymentMode === 'deposit'}
                  onChange={() => setPaymentMode('deposit')}
                  className="mt-0.5 accent-indigo-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">Deposit</span>
                  <p className="text-xs text-slate-500 mt-0.5">Charge a fixed amount upfront to secure the booking — applied toward the service at checkout.</p>
                </div>
              </label>

              {paymentMode === 'deposit' && (
                <div className="ml-6 flex items-center gap-3 max-w-xs">
                  <label className="text-sm text-slate-700 whitespace-nowrap">Amount (CAD)</label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      step="1"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg pl-7 pr-3 py-2 min-h-[40px]"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="paymentMode" value="full"
                  checked={paymentMode === 'full'}
                  onChange={() => setPaymentMode('full')}
                  className="mt-0.5 accent-indigo-600" />
                <div>
                  <span className="text-sm font-medium text-slate-900">Full payment upfront</span>
                  <p className="text-xs text-slate-500 mt-0.5">Charge the complete service price when the client books — nothing to collect at the appointment. The amount adjusts automatically per service.</p>
                </div>
              </label>
            </div>

            {paymentMode !== 'none' && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stripe credentials</p>

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 flex items-center gap-2">
                    Secret key
                    {hasStripeKey && !stripeKey && (
                      <span className="text-emerald-600 font-medium">✓ Configured</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={stripeKey}
                    onChange={e => setStripeKey(e.target.value)}
                    placeholder={hasStripeKey ? 'Leave blank to keep existing' : 'sk_live_…'}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 flex items-center gap-2">
                    Webhook secret
                    {hasStripeWebhookSecret && !stripeWebhook && (
                      <span className="text-emerald-600 font-medium">✓ Configured</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={stripeWebhook}
                    onChange={e => setStripeWebhook(e.target.value)}
                    placeholder={hasStripeWebhookSecret ? 'Leave blank to keep existing' : 'whsec_…'}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px] font-mono"
                  />
                  <p className="text-xs text-slate-400">
                    Create a webhook in Stripe Dashboard → Developers → Webhooks pointing to{' '}
                    <span className="font-mono">{`https://${subdomain}.barberqueue.pro/api/webhooks/stripe`}</span>{' '}
                    listening for <span className="font-mono">checkout.session.completed</span>.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Shop logo */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Shop logo</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Shown in your booking page header and dashboard sidebar. JPEG, PNG or WebP, max 2 MB.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {logoUrl && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Shop logo" className="w-full h-full object-contain p-1" />
                </div>
              )}
              <input
                ref={logoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  disabled={logoUploading}
                  className="text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 min-h-[40px]"
                >
                  {logoUploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleLogoRemove}
                    disabled={logoUploading}
                    className="text-sm font-medium px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 min-h-[40px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Brand color palette */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Brand color</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Applied to your booking page and dashboard sidebar.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setBrandTheme(theme.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                    brandTheme === theme.id
                      ? 'border-slate-900 scale-105 shadow-md'
                      : 'border-transparent hover:border-slate-300'
                  }`}
                  title={theme.label}
                >
                  <div className="h-10" style={{ background: theme.preview[0] }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 h-3"
                      style={{ background: theme.preview[1] }}
                    />
                  </div>
                  <span className="block text-xs text-center py-1 text-slate-600 font-medium bg-white">
                    {theme.label}
                  </span>
                  {brandTheme === theme.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                      <svg className="w-2.5 h-2.5 text-slate-900" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Staff view link */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Staff view link</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Share this link with your team. Anyone with it can see the schedule — read only, no login required.
            </p>
            {staffUrl ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={staffUrl}
                  className="flex-1 min-w-0 text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 font-mono truncate min-h-[40px]"
                  onFocus={e => e.target.select()}
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 min-h-[40px]"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 min-h-[40px]"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Token not available — try refreshing the page.</p>
            )}
          </section>

        </>
      )}

      {/* Services tab */}
      {activeTab === 'services' && (
        <>
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
                  <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <input
                      type="text"
                      value={svc.name}
                      onChange={(e) => updateService(i, 'name', e.target.value)}
                      placeholder="Service name (e.g. Classic Haircut)"
                      maxLength={80}
                      aria-label={`Service ${i + 1} name`}
                      className="flex-1 min-w-0 text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px]"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
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
                      <select
                        value={svc.duration_min}
                        onChange={(e) => updateService(i, 'duration_min', e.target.value)}
                        aria-label={`Service ${i + 1} duration`}
                        className="text-sm border border-slate-300 rounded-lg px-2 py-2 bg-white min-h-[40px]"
                      >
                        {SERVICE_DURATIONS.map(d => (
                          <option key={d} value={d}>{d} min</option>
                        ))}
                      </select>
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

        </>
      )}

      {/* Barbers tab */}
      {activeTab === 'barbers' && (
        <BarbersTab initialBarbers={initialBarbers} />
      )}

      {/* Gallery tab */}
      {activeTab === 'gallery' && (
        <GalleryTab initialPhotos={initialGallery} />
      )}

      {/* Reminders tab */}
      {activeTab === 'reminders' && (
        <>
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Appointment reminder</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Automatic email sent to clients before their appointment.
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
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${reminderActive ? 'translate-x-5' : 'translate-x-0'}`} />
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

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Flash discount</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Discount percentage offered in the flash deal email sent to inactive clients when a
              no-show occurs. Requires the <span className="font-medium text-slate-700">Flash discount on no-show</span> toggle
              to be active in <a href="/automations" className="text-indigo-600 hover:underline">Automations</a>.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                inputMode="numeric"
                value={flashDiscountPct}
                onChange={e => setFlashDiscountPct(Number(e.target.value) || 20)}
                aria-label="Flash discount percentage"
                className="w-24 text-sm border border-slate-300 rounded-lg px-3 py-2 min-h-[40px] text-center"
              />
              <span className="text-sm text-slate-700">% off</span>
            </div>
          </section>

        </>
      )}
    </div>
  )
}

function SaveBar({
  feedback,
  saving,
  onSave,
}: {
  feedback: { type: 'success' | 'error'; text: string } | null
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
      {feedback ? (
        <p role="status" className={`text-sm ${feedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
          {feedback.text}
        </p>
      ) : <span className="hidden sm:block" />}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  )
}
