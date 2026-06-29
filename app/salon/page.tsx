import type { Metadata } from 'next'
import Link from 'next/link'
import { Playfair_Display, DM_Mono, Nunito_Sans } from 'next/font/google'

export const metadata: Metadata = {
  title: 'SalonQueue — Beauty salon management for Toronto',
  description:
    'Online booking, deposit protection, loyalty rewards, and AI auto-replies for independent beauty salons in Toronto. Nails, skin care, haircuts, lashes, and more.',
}
import {
  Sparkles, MessageSquare, Gift, RotateCcw, Star,
  ArrowRight, Check, Bot, CalendarCheck,
  X as XIcon, AlertCircle, TrendingDown, EyeOff,
  ChevronDown, Bell, Clock, Users, TrendingUp,
  CreditCard, ShieldCheck, Gem,
} from 'lucide-react'

// ─── Fonts ────────────────────────────────────────────────────────────────────

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })
const dmMono   = DM_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-mono' })
const nunito   = Nunito_Sans({ subsets: ['latin'], variable: '--font-body' })

// ─── Shared visual tokens ─────────────────────────────────────────────────────

const SHIMMER: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(180deg, #7c3aed 0 10px, #db2777 10px 20px, #c8956c 20px 30px, #db2777 30px 40px)',
  backgroundSize: '40px 40px',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: CalendarCheck,
    title: 'Online booking page',
    description: 'Your own page at yoursalon.salonqueue.pro/book — clients pick their service, stylist, and time. Deposit collected automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'No-show protection',
    description: 'Deposit upfront + flash-discount recovery text + waitlist auto-fill. Three layers that run the moment someone no-shows.',
  },
  {
    icon: CreditCard,
    title: 'Deposit & full payment',
    description: 'Charge a deposit or the full service price via Stripe. Works with Apple Pay, Google Pay, and all major cards.',
    badge: 'New',
  },
  {
    icon: Gift,
    title: 'Loyalty program',
    description: 'Bronze to Platinum — clients earn points every visit. Keeps them coming back to your chair, not the salon down the street.',
  },
  {
    icon: RotateCcw,
    title: 'Client win-back',
    description: 'Flags anyone inactive 30+ days and sends a personal nudge. Runs automatically every week without you lifting a finger.',
  },
  {
    icon: Star,
    title: 'Google review requests',
    description: '30 minutes after the appointment, your client gets a review request. More stars, higher ranking, more walk-ins.',
  },
  {
    icon: Clock,
    title: 'Waitlist auto-fill',
    description: 'The moment a slot opens, SalonQueue texts the next person on the list. Your chair stays full, every day.',
  },
  {
    icon: Bot,
    title: 'AI auto-replies',
    description: "Clients text your salon — the AI answers in seconds. Hours, services, pricing, booking link. You step in when you want.",
  },
]

const problems = [
  {
    icon: TrendingDown,
    pain: 'Clients no-show and you lose the slot. That hour is gone — and so is the revenue.',
    fix: 'Deposit at booking + flash-discount recovery text + waitlist auto-fill. All fires automatically the moment they ghost.',
  },
  {
    icon: EyeOff,
    pain: 'Your regulars quietly drift away — you notice months later when revenue dips.',
    fix: 'We flag anyone inactive 30+ days and send a personal nudge. Write the message once. Runs every week on its own.',
  },
  {
    icon: AlertCircle,
    pain: 'The salon two blocks away has 300 Google reviews. You have 15.',
    fix: 'Every client gets an automatic review request 30 minutes after their appointment. More stars, higher on Google Maps, more new clients.',
  },
  {
    icon: Bot,
    pain: "You're mid-facial and your phone won't stop — 'do you do lash extensions?', 'how much is a gel manicure?'",
    fix: "The AI reads your service menu and answers 24/7 — pricing, availability, booking link. Clients get answers fast, you stay focused.",
  },
]

const steps = [
  {
    label: '01',
    title: 'Set up your salon',
    description:
      'Create your account, add your services and hours. Your salon gets its own dashboard and a live booking page at yoursalon.salonqueue.pro — ready in under 10 minutes.',
  },
  {
    label: '02',
    title: 'Share your booking page',
    description:
      'Drop yoursalon.salonqueue.pro/book in your Instagram bio or Google profile. Clients browse your gallery, pick a stylist, choose a time, and pay a deposit — no phone tag.',
  },
  {
    label: '03',
    title: 'Let it run',
    description:
      'Reminders fire 24h before. Reviews request 30 min after. No-show recovery texts send instantly. Win-back nudges go weekly. Waitlist fills every open slot. You just keep creating.',
  },
]

const comparison = [
  { feature: 'Online booking page',                    old: 'Phone calls',    other: true,           ours: true },
  { feature: 'No-show SMS recovery',                   old: 'Manual',         other: false,          ours: true },
  { feature: 'Flash discount no-show recovery',        old: false,            other: false,          ours: true },
  { feature: 'Appointment reminders (SMS + email)',     old: false,            other: 'SMS only',     ours: 'SMS + email' },
  { feature: 'SMS automations',                        old: 'Manual or none', other: 'Coming soon',  ours: true },
  { feature: 'AI auto-replies to texts',               old: false,            other: false,          ours: true },
  { feature: 'Loyalty program',                        old: 'Punch cards',    other: false,          ours: '4 tiers' },
  { feature: 'Inactive-client win-back',               old: 'Manual',         other: false,          ours: true },
  { feature: 'Google review requests',                 old: false,            other: false,          ours: true },
  { feature: 'Online payments & deposits',             old: false,            other: 'Paid add-on',  ours: true },
  { feature: 'Waitlist auto-fill',                     old: false,            other: false,          ours: true },
  { feature: 'Staff schedule portal (no login)',        old: false,            other: false,          ours: true },
  { feature: 'Monthly price',                          old: '—',              other: '$29–$199 CAD', ours: 'From $19.99' },
] satisfies ReadonlyArray<{
  feature: string
  old: string | boolean
  other: string | boolean
  ours: string | boolean
}>

const faqs = [
  {
    q: 'Do I need to be technical to set this up?',
    a: 'No. Sign-up takes about 10 minutes. Add your services, set your hours, and your booking page is live. No developer, no third-party integrations, no complicated setup.',
  },
  {
    q: 'Can my clients book online without calling me?',
    a: 'Yes. Every salon gets a booking page at yoursalon.salonqueue.pro/book. Clients browse your gallery, pick a stylist, choose a service and time, and pay a deposit if you have it enabled. Share it on Instagram, your website, or your Google Business profile.',
  },
  {
    q: 'How do deposits work? Do I need a Stripe account?',
    a: 'Yes — you connect your own Stripe account (free to sign up). Enter your keys in Settings, set a deposit amount or enable full-payment mode, and Stripe sends money directly to your bank. SalonQueue never touches your payouts.',
  },
  {
    q: 'Can my stylists see their schedule without logging in?',
    a: 'Yes. The multi-staff plan includes a read-only staff schedule portal — a private link you share with your team. No account, no password, auto-refreshes every 2 minutes. Regenerate the link from Settings any time.',
  },
  {
    q: 'Do I need to set up an SMS provider?',
    a: 'No. SMS is fully included — we handle the phone number, the carrier, and the delivery. You write your messages and we send them. Email reminders are also included.',
  },
  {
    q: 'What happens after the 14-day free trial?',
    a: '$19.99 CAD/month + applicable taxes, billed monthly. Cancel anytime — no contracts, no penalties.',
  },
  {
    q: 'Will my clients get spammed?',
    a: 'No. Every automation has a clear trigger — a no-show, an inactive period, a completed visit — and you can pause any of them with one click from your dashboard.',
  },
  {
    q: 'Can I use this for nails, skin care, lashes, and other services?',
    a: "Absolutely. You define your own service menu — haircuts, facials, manicures, gel nails, lash extensions, waxing, brow shaping, any combination. The booking page shows exactly what you offer with the duration and price you set.",
  },
  {
    q: 'What about walk-in clients?',
    a: 'Instant walk-in entry from your dashboard — no booking required. SalonQueue finds or creates the client, logs the service, awards loyalty points, and marks the visit complete in one tap. No phone number required.',
  },
  {
    q: 'Do you support multiple locations?',
    a: 'One salon per subscription today. Multi-location is on the roadmap — reach out if you need it sooner.',
  },
]

const pricingFeatures = [
  'Public booking page (yoursalon.salonqueue.pro/book)',
  'Unlimited clients & visit history',
  'Deposit or full payment at booking (Stripe)',
  'Flash discount no-show recovery',
  'Waitlist auto-fill on cancellations',
  'Loyalty program — Bronze to Platinum',
  'Inactive client win-back (30-day auto-SMS)',
  'Google review requests after every appointment',
  'AI-powered SMS auto-replies',
  'Client self-cancel portal',
  'Private subdomain dashboard',
]

const multiStaffFeatures = [
  'Unlimited stylists on your roster',
  'Stylist cards with photo, bio & Instagram on booking page',
  'Per-stylist custom schedule & hours',
  'Least-loaded auto-assign keeps every chair busy',
  'Revenue & visit tracking per stylist — payroll-ready',
  'Read-only staff schedule portal — no login, auto-refreshes',
  'Booking email notification sent directly to each stylist',
]

const smsPreview = [
  {
    label: 'Deposit confirmed · just now',
    text: 'Payment confirmed — your $30 deposit for a Gel Manicure at Bella Studio on Wed, Jun 4 at 2:00 PM is locked in. See you then!',
    inbound: true,
  },
  {
    label: 'Flash recovery · no-show',
    text: "Sofia, you missed today at Bella Studio — rebook within 48 hrs and get 20% off your next visit. Just reply YES and we'll lock it in.",
    inbound: false,
  },
  {
    label: 'Waitlist · slot opened',
    text: "Good news — a spot just opened at Bella Studio on Fri, Jun 6 at 11:00 AM. Book now before it fills: bellastudio.salonqueue.pro/book",
    inbound: true,
  },
]

const revenueWeeks = [
  { label: 'Apr 7',  v: 38 }, { label: 'Apr 14', v: 52 }, { label: 'Apr 21', v: 47 },
  { label: 'Apr 28', v: 61 }, { label: 'May 5',  v: 58 }, { label: 'May 12', v: 74 },
  { label: 'May 19', v: 83 }, { label: 'This wk', v: 96 },
]
const heatHours = [10, 22, 35, 41, 30, 18, 12, 26, 48, 67, 84, 92, 70, 44]
const topServices = [
  { name: 'Gel manicure',  v: 100 },
  { name: 'Highlights',    v: 82 },
  { name: 'Facial',        v: 65 },
  { name: 'Lash tint',     v: 40 },
  { name: 'Brow shaping',  v: 24 },
]

// ─── Cell helper ──────────────────────────────────────────────────────────────

function ComparisonCell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full"
        style={highlight ? { background: 'var(--rose)' } : { background: 'rgba(0,0,0,0.06)' }}
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: highlight ? '#fff' : 'rgba(0,0,0,0.4)' }} />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ background: 'rgba(0,0,0,0.03)' }}>
        <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: 'rgba(0,0,0,0.18)' }} />
      </span>
    )
  }
  return (
    <span
      className="text-sm font-bold"
      style={{ fontFamily: 'var(--font-mono)', color: highlight ? 'var(--rose)' : 'rgba(0,0,0,0.45)' }}
    >
      {value}
    </span>
  )
}

// ─── Mockups ──────────────────────────────────────────────────────────────────

function DashboardMock() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#1e0a3c] border-b border-black/30">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--rose)' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--violet)' }} />
        <span className="ml-3 flex-1 truncate rounded-md bg-white/10 px-2.5 py-1 text-[10px] text-white/50" style={{ fontFamily: 'var(--font-mono)' }}>
          bellastudio.salonqueue.pro
        </span>
      </div>
      <div className="flex">
        <div className="hidden sm:flex w-32 shrink-0 flex-col gap-1 bg-[#1e0a3c] p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--rose)' }} />
            <span className="text-[10px] font-bold text-white">Bella Studio</span>
          </div>
          {['Dashboard', 'Agenda', 'Clients', 'Messages', 'Analytics', 'Settings'].map((n, i) => (
            <div
              key={n}
              className="rounded-md px-2 py-1 text-[9px] font-medium"
              style={i === 0 ? { background: 'var(--rose)', color: '#fff' } : { color: 'rgba(255,255,255,0.45)' }}
            >
              {n}
            </div>
          ))}
        </div>
        <div className="flex-1 bg-[#faf7ff] p-3.5 sm:p-4">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { l: 'Today', v: '9', s: 'appointments' },
              { l: 'Revenue', v: '$415', s: 'today' },
              { l: 'Clients', v: '186', s: 'registered' },
            ].map((c) => (
              <div key={c.l} className="rounded-lg bg-white p-2.5 ring-1 ring-black/5">
                <p className="text-[8px] uppercase tracking-wider text-black/40" style={{ fontFamily: 'var(--font-mono)' }}>{c.l}</p>
                <p className="text-lg font-extrabold leading-tight text-[#1e0a3c]">{c.v}</p>
                <p className="text-[8px] text-black/35">{c.s}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-white p-3 ring-1 ring-black/5">
            <p className="mb-2 text-[10px] font-bold text-[#1e0a3c]">Today&apos;s appointments</p>
            <div className="space-y-1.5">
              {[
                { t: '10:00', n: 'Sofia M.', s: 'Gel Manicure', c: 'var(--rose)' },
                { t: '11:30', n: 'Camila R.', s: 'Highlights', c: 'var(--violet)' },
                { t: '13:00', n: 'Ana P.', s: 'Facial', c: 'var(--gold)' },
              ].map((a) => (
                <div key={a.t} className="flex items-center gap-2 rounded-md bg-[#faf7ff] px-2 py-1.5">
                  <span className="w-1 self-stretch rounded-full" style={{ background: a.c }} />
                  <span className="text-[9px] font-bold tabular-nums text-black/55" style={{ fontFamily: 'var(--font-mono)' }}>{a.t}</span>
                  <span className="text-[10px] font-semibold text-[#1e0a3c]">{a.n}</span>
                  <span className="ml-auto text-[9px] text-black/40">{a.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhoneMock() {
  return (
    <div className="w-[170px] rounded-[26px] bg-[#1e0a3c] p-1.5 shadow-2xl ring-1 ring-white/10">
      <div className="overflow-hidden rounded-[20px] bg-[#faf7ff]">
        <div className="relative bg-[#1e0a3c] px-3 pb-4 pt-3 text-center">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
          <p className="text-[11px] font-bold text-white">Bella Studio</p>
          <p className="text-[8px] text-white/45" style={{ fontFamily: 'var(--font-mono)' }}>Book your appointment</p>
        </div>
        <div className="space-y-2 p-2.5">
          <p className="text-[8px] font-bold uppercase tracking-wider text-black/40" style={{ fontFamily: 'var(--font-mono)' }}>Pick your stylist</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[{ n: 'Maria', on: true }, { n: 'Lucia', on: false }].map((b) => (
              <div
                key={b.n}
                className="rounded-lg p-1.5 text-center"
                style={b.on
                  ? { background: 'var(--rose)', color: '#fff' }
                  : { background: '#fff', color: '#1e0a3c', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
              >
                <div className="mx-auto mb-1 h-6 w-6 rounded-full" style={{ background: b.on ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)' }} />
                <p className="text-[9px] font-bold">{b.n}</p>
              </div>
            ))}
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-black/40" style={{ fontFamily: 'var(--font-mono)' }}>Available today</p>
          <div className="grid grid-cols-3 gap-1.5">
            {['10:00', '11:30', '1:00', '2:30', '3:00', '4:30'].map((t, i) => (
              <div
                key={t}
                className="rounded-md py-1 text-center text-[8px] font-bold tabular-nums"
                style={i === 3
                  ? { background: 'var(--violet)', color: '#fff', fontFamily: 'var(--font-mono)' }
                  : { background: '#fff', color: '#1e0a3c', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)', fontFamily: 'var(--font-mono)' }}
              >
                {t}
              </div>
            ))}
          </div>
          <button className="w-full rounded-lg py-2 text-[9px] font-bold text-white" style={{ background: 'var(--rose)' }}>
            Confirm booking →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalonPage() {
  const rootStyle = {
    '--ink':    '#1e0a3c',
    '--paper':  '#faf7ff',
    '--paper-2':'#ede8f5',
    '--rose':   '#be185d',
    '--violet': '#7c3aed',
    '--gold':   '#c8956c',
    fontFamily: 'var(--font-body)',
    background: 'var(--paper)',
    color:      'var(--ink)',
  } as React.CSSProperties

  return (
    <div className={`${playfair.variable} ${dmMono.variable} ${nunito.variable} min-h-screen scroll-smooth`} style={rootStyle}>

      <style>{`
        @keyframes sq-shimmer { from { background-position: 0 0 } to { background-position: 0 40px } }
        @keyframes sq-rise { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: none } }
        @keyframes sq-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes sq-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes sq-grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        .sq-rise { animation: sq-rise .8s cubic-bezier(.16,1,.3,1) both }
        .sq-shimmer { animation: sq-shimmer 2s linear infinite }
        .sq-float { animation: sq-float 6s ease-in-out infinite }
        .sq-bar { transform-origin: bottom; animation: sq-grow .9s cubic-bezier(.16,1,.3,1) both }
        @media (prefers-reduced-motion: reduce) {
          .sq-rise,.sq-shimmer,.sq-float,.sq-bar { animation: none !important }
        }
        .sq-display { font-family: var(--font-display); letter-spacing: .01em; }
        .sq-mono { font-family: var(--font-mono); }
      `}</style>

      {/* ── Nav ── */}
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-[var(--ink)]/10 backdrop-blur-md"
        style={{ background: 'rgba(250,247,255,0.92)' }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/salon" className="flex items-center gap-2">
            <Sparkles className="h-7 w-7" style={{ color: 'var(--rose)' }} />
            <span className="sq-display text-xl leading-none text-[var(--ink)]">SalonQueue</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-[var(--ink)] transition-colors hover:text-[var(--rose)]">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--rose)' }}
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[var(--ink)] px-6 pb-24 pt-28 sm:pt-32">
        {/* shimmer accent bar */}
        <span aria-hidden className="sq-shimmer absolute inset-y-0 left-0 hidden w-2.5 opacity-80 md:block" style={SHIMMER} />
        {/* texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        {/* glow */}
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-24 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(190,24,93,.3), transparent 70%)' }} />
        <div aria-hidden className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.2), transparent 70%)' }} />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_1.05fr]">

            <div>
              <div className="sq-rise mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--paper)]" style={{ fontFamily: 'var(--font-mono)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--rose)' }} />
                For independent salons · Toronto
              </div>

              <h1 className="sq-display sq-rise text-6xl leading-[0.92] text-[var(--paper)] sm:text-7xl" style={{ animationDelay: '.08s' }}>
                YOUR SALON,<br />
                <span style={{ color: 'var(--rose)' }}>FULLY BOOKED.</span><br />
                <span style={{ color: 'var(--gold)' }}>ALWAYS.</span>
              </h1>

              <p className="sq-rise mt-7 max-w-md text-lg leading-relaxed text-white/65" style={{ animationDelay: '.16s' }}>
                Online booking with deposit protection, flash recovery on no-shows,
                loyalty rewards, waitlist auto-fill, and AI auto-replies — all in one place.
                From nails to skin care to haircuts — your salon, fully on autopilot.
              </p>

              <div className="sq-rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '.24s' }}>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--rose)' }}
                >
                  Start your 14-day free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  See how it works
                </a>
              </div>

              <p className="sq-rise mt-5 text-xs text-white/55" style={{ animationDelay: '.32s' }}>
                No credit card · $19.99 CAD/mo + tax after trial · Cancel anytime
              </p>
            </div>

            {/* product mockups */}
            <div className="sq-rise relative" style={{ animationDelay: '.2s' }}>
              <DashboardMock />
              <div className="sq-float absolute -bottom-10 -left-4 hidden sm:block" style={{ animationDelay: '.5s' }}>
                <PhoneMock />
              </div>
              {/* floating notification */}
              <div className="sq-float absolute -right-3 -top-6 hidden w-56 rounded-2xl bg-white p-3.5 shadow-2xl ring-1 ring-black/5 sm:block">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'var(--rose)' }}>
                    <Bell className="h-2.5 w-2.5 text-white" />
                  </span>
                  <span className="sq-mono text-[9px] font-bold uppercase tracking-wider text-black/40">New booking + deposit · just now</span>
                </div>
                <p className="text-[11px] leading-snug text-[#1e0a3c]">
                  Sofia booked a Gel Manicure at 2:00 PM — $30 deposit paid. Confirmed.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust marquee ── */}
      <div className="overflow-hidden border-y border-[var(--rose)]/30 py-3" style={{ background: 'var(--rose)' }}>
        <div className="flex w-max" style={{ animation: 'sq-marquee 28s linear infinite' }}>
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
              {[
                'Online booking included', 'Deposits & full payment built in', 'Nails · Skin Care · Haircut · Lashes · Brows',
                'SMS sent automatically', 'Flash recovery on no-shows', 'Set up in under 10 minutes',
                'Loyalty built in', 'Waitlist auto-fill', 'AI answers your texts', 'Reviews on autopilot',
              ].map((item) => (
                <span key={item} className="sq-mono flex items-center gap-3 px-6 text-sm font-bold uppercase tracking-wide text-white">
                  {item}
                  <Sparkles className="h-3 w-3 text-white/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem → Solution ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="sq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--rose)' }}>
              Why salons switch
            </p>
            <h2 className="sq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">
              THE LEAKS DRAINING YOUR SALON.<br />
              <span style={{ color: 'var(--violet)' }}>WE CLOSE EVERY ONE.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {problems.map((p) => (
              <div
                key={p.pain}
                className="grid grid-cols-1 items-start gap-6 rounded-2xl border border-[var(--ink)]/12 bg-[var(--paper-2)] p-6 sm:p-8 md:grid-cols-[auto_1fr_1fr] md:gap-8"
                style={{ boxShadow: '4px 4px 0 rgba(30,10,60,0.08)' }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--rose)' }}>
                  <p.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="sq-mono mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rose)' }}>The problem</p>
                  <p className="font-bold leading-snug text-[var(--ink)]">{p.pain}</p>
                </div>
                <div className="md:border-l md:border-[var(--ink)]/10 md:pl-8">
                  <p className="sq-mono mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--violet)' }}>We fix it</p>
                  <p className="leading-snug text-black/65">{p.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (bento) ── */}
      <section id="features" className="bg-[var(--ink)] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="sq-display text-4xl leading-none text-[var(--paper)] sm:text-5xl">
              EVERYTHING YOUR SALON NEEDS.<br />
              <span className="text-white/35">NOTHING IT DOESN&apos;T.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/50">
              Eight tools that run while you work — no extra apps, no setup headaches.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:bg-white/[0.06] ${i === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
              >
                {f.badge && (
                  <span className="sq-mono absolute right-5 top-5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: 'var(--rose)' }}>
                    <Sparkles className="h-2.5 w-2.5" />
                    {f.badge}
                  </span>
                )}
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: i % 2 ? 'rgba(124,58,237,0.2)' : 'rgba(190,24,93,0.18)' }}>
                  <f.icon className="h-5 w-5" style={{ color: i % 2 ? '#a78bfa' : '#f9a8c9' }} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--paper)]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{f.description}</p>
                <span aria-hidden className="absolute -bottom-px left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full" style={{ background: 'var(--rose)' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Analytics showcase ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="sq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--rose)' }}>
                Know your numbers
              </p>
              <h2 className="sq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">
                SEE EXACTLY WHAT&apos;S<br />
                <span style={{ color: 'var(--violet)' }}>MAKING YOU MONEY.</span>
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-black/65">
                A live dashboard tracks revenue week by week, top services, busiest hours, no-show rate, and appointment status breakdown — so you know where money is leaking and when to staff up.
              </p>
              <div className="mt-7 grid grid-cols-3 gap-3">
                {[
                  { icon: TrendingUp, l: 'Revenue this month', v: '$5,240' },
                  { icon: ShieldCheck, l: 'No-show rate', v: '2.9%' },
                  { icon: Users, l: 'Registered clients', v: '186' },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-[var(--ink)]/10 bg-[var(--paper-2)] p-3" style={{ boxShadow: '3px 3px 0 rgba(30,10,60,0.08)' }}>
                    <s.icon className="mb-1.5 h-4 w-4" style={{ color: 'var(--rose)' }} />
                    <p className="text-xl font-extrabold leading-none text-[var(--ink)]">{s.v}</p>
                    <p className="sq-mono mt-1 text-[9px] uppercase leading-tight tracking-wide text-black/45">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--ink)]/12 bg-white p-5 sm:p-6" style={{ boxShadow: '6px 6px 0 rgba(30,10,60,0.08)' }}>
              <p className="text-sm font-bold text-[#1e0a3c]">Revenue · last 8 weeks</p>
              <p className="sq-mono mb-4 text-[10px] uppercase tracking-wide text-black/35">From completed appointments</p>
              <div className="flex h-28 items-end gap-2">
                {revenueWeeks.map((w, i) => (
                  <div key={w.label} className="group flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="sq-bar w-full rounded-t-sm"
                        style={{
                          height: `${w.v}%`,
                          background: i === revenueWeeks.length - 1 ? 'var(--rose)' : 'var(--violet)',
                          animationDelay: `${i * 0.06}s`,
                          opacity: i === revenueWeeks.length - 1 ? 1 : 0.45 + i * 0.07,
                        }}
                      />
                    </div>
                    <span className="sq-mono text-[7px] text-black/35">{w.label}</span>
                  </div>
                ))}
              </div>

              <div className="my-5 h-px bg-black/10" />

              <p className="text-sm font-bold text-[#1e0a3c]">Busiest times</p>
              <p className="sq-mono mb-3 text-[10px] uppercase tracking-wide text-black/35">8 AM – 9 PM</p>
              <div className="flex gap-1">
                {heatHours.map((h, i) => (
                  <div key={i} className="flex-1">
                    <div
                      className="h-8 rounded-sm"
                      style={{ background: `color-mix(in srgb, var(--rose) ${Math.max(8, h)}%, #ede8f5)` }}
                    />
                  </div>
                ))}
              </div>

              <div className="my-5 h-px bg-black/10" />

              <p className="text-sm font-bold text-[#1e0a3c]">Top services · 30 days</p>
              <div className="mt-3 space-y-1.5">
                {topServices.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[10px] font-semibold text-black/60">{s.name}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="sq-bar h-full rounded-full"
                        style={{ width: `${s.v}%`, background: i === 0 ? 'var(--rose)' : 'var(--violet)', transformOrigin: 'left', animationDelay: `${i * 0.08}s` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-[var(--paper-2)] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="sq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">UP AND RUNNING IN MINUTES</h2>
            <p className="mx-auto mt-4 max-w-md text-black/55">Three steps and you&apos;re live. No developer needed.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.label} className="relative rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] p-7" style={{ boxShadow: '4px 4px 0 rgba(30,10,60,0.07)' }}>
                <span className="sq-display mb-4 block text-6xl leading-none" style={{ color: i === 0 ? 'var(--rose)' : i === 1 ? 'var(--violet)' : 'var(--gold)' }}>
                  {step.label}
                </span>
                <h3 className="mb-2 text-lg font-bold text-[var(--ink)]">{step.title}</h3>
                <p className="text-sm leading-relaxed text-black/60">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SMS preview band ── */}
      <section className="relative overflow-hidden bg-[var(--ink)] px-6 py-24">
        <span aria-hidden className="sq-shimmer absolute inset-y-0 right-0 hidden w-2.5 opacity-70 md:block" style={SHIMMER} />
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="sq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--gold)' }}>
              Every message fires automatically
            </p>
            <h2 className="sq-display text-4xl leading-none text-[var(--paper)] sm:text-5xl">YOUR SALON, TALKING FOR YOU.<br /><span className="text-white/35">BEFORE YOU EVEN NOTICE.</span></h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {smsPreview.map((sms, i) => (
              <div key={sms.label} className="sq-float rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10" style={{ animationDelay: `${i * 0.4}s` }}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: sms.inbound ? 'var(--violet)' : 'var(--rose)' }}>
                    <MessageSquare className="h-3 w-3 text-white" />
                  </span>
                  <span className="sq-mono text-[10px] font-bold uppercase tracking-wider text-white/40">{sms.label}</span>
                </div>
                <div
                  className="rounded-2xl px-3.5 py-3 text-sm leading-relaxed"
                  style={sms.inbound
                    ? { background: 'var(--violet)', color: '#fff', borderBottomLeftRadius: 4 }
                    : { background: '#fff', color: '#1e0a3c', borderBottomRightRadius: 4 }}
                >
                  {sms.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="sq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--rose)' }}>What makes us different</p>
            <h2 className="sq-display text-5xl leading-none text-[var(--ink)] sm:text-6xl">
              MORE FEATURES.<br />
              <span style={{ color: 'var(--rose)' }}>HALF THE PRICE.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-black/50">
              vs. Vagaro, Fresha, GlossGenius, and the rest.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--ink)]/12 bg-white" style={{ boxShadow: '6px 6px 0 rgba(30,10,60,0.08)' }}>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--ink)]/10">
                  <th className="w-2/5 px-6 py-5 text-left" />
                  <th className="sq-mono px-6 py-5 text-center text-[11px] font-bold uppercase tracking-wide text-black/40">Old way</th>
                  <th className="sq-mono px-6 py-5 text-center text-[11px] font-bold uppercase tracking-wide text-black/40">
                    Other apps<br />
                    <span className="text-[9px] normal-case font-normal tracking-normal text-black/30">Vagaro · Fresha · GlossGenius</span>
                  </th>
                  <th className="sq-mono border-x border-[var(--ink)]/10 px-6 py-5 text-center text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: 'var(--ink)' }}>
                    SalonQueue
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b border-black/5 last:border-0">
                    <td className="px-6 py-4 font-semibold text-[var(--ink)]">{row.feature}</td>
                    <td className="px-6 py-4 text-center"><ComparisonCell value={row.old} /></td>
                    <td className="px-6 py-4 text-center"><ComparisonCell value={row.other} /></td>
                    <td className="border-x border-[var(--ink)]/10 px-6 py-4 text-center" style={{ background: 'rgba(190,24,93,0.05)' }}>
                      <ComparisonCell value={row.ours} highlight />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="sq-mono mt-6 text-center text-[11px] text-black/40">
            Comparison reflects publicly listed competitor plans at the time of writing.
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-[var(--ink)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="sq-display text-4xl leading-none text-[var(--paper)] sm:text-5xl">SIMPLE PRICING</h2>
            <p className="mt-3 text-white/50">Two plans. Everything included. No hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">

            {/* Solo stylist */}
            <div className="relative flex flex-col overflow-hidden rounded-2xl bg-[var(--paper)] p-7" style={{ boxShadow: '8px 8px 0 var(--rose)' }}>
              <span aria-hidden className="sq-shimmer absolute inset-x-0 top-0 h-2" style={SHIMMER} />
              <div className="mb-4 mt-1 flex items-start justify-between">
                <p className="sq-mono text-xs font-bold uppercase tracking-widest text-black/45">Solo stylist</p>
                <span className="sq-mono rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: 'var(--rose)' }}>
                  Launch — save 33%
                </span>
              </div>

              <div className="mb-1 flex items-end gap-0.5">
                <span className="sq-mono text-xl font-bold leading-none text-black/35 line-through">$29.99</span>
                <span className="sq-mono mb-0.5 ml-1 text-xs text-black/35 line-through">CAD/mo</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="sq-display text-7xl leading-[0.8] text-[var(--ink)]">$19</span>
                <span className="sq-display mb-1 text-3xl text-[var(--ink)]">.99</span>
                <span className="mb-2 ml-1 text-base text-black/50">CAD/mo</span>
              </div>
              <p className="mb-1 text-xs text-black/45">+ applicable taxes</p>
              <p className="mb-7 text-sm font-bold" style={{ color: 'var(--rose)' }}>14 days free — no credit card</p>

              <ul className="mb-7 flex-1 space-y-2.5">
                {pricingFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-black/70">
                    <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--rose)' }} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition-transform hover:-translate-y-0.5" style={{ background: 'var(--rose)' }}>
                Start 14-day free trial
              </Link>
            </div>

            {/* Multi-staff */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7">
              <div className="mb-4 flex items-start justify-between">
                <p className="sq-mono text-xs font-bold uppercase tracking-widest text-white/45">Multi-staff</p>
                <span className="sq-mono rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
                  Launch — save 40%
                </span>
              </div>

              <div className="mb-1 flex items-end gap-0.5">
                <span className="sq-mono text-xl font-bold leading-none text-white/35 line-through">$49.99</span>
                <span className="sq-mono mb-0.5 ml-1 text-xs text-white/35 line-through">CAD/mo</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="sq-display text-7xl leading-[0.8] text-[var(--paper)]">$29</span>
                <span className="sq-display mb-1 text-3xl text-[var(--paper)]">.99</span>
                <span className="mb-2 ml-1 text-base text-white/45">CAD/mo</span>
              </div>
              <p className="mb-1 text-xs text-white/40">+ applicable taxes</p>
              <p className="mb-1 text-sm font-bold" style={{ color: 'var(--gold)' }}>14 days free — no credit card</p>
              <p className="mb-5 text-sm text-white/55">Everything in Solo, plus team tools:</p>

              <ul className="mb-7 flex-1 space-y-2.5">
                {multiStaffFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white/70">
                    <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--gold)' }} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="block w-full rounded-xl border border-white/20 bg-white/5 py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-white/10">
                Start 14-day free trial
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="sq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--rose)' }}>Frequently asked</p>
            <h2 className="sq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">QUESTIONS, ANSWERED.</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((item) => (
              <details key={item.q} className="group overflow-hidden rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper-2)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-black/[0.02]">
                  <span className="text-sm font-bold text-[var(--ink)] sm:text-base">{item.q}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: 'var(--rose)' }} />
                </summary>
                <div className="border-t border-black/8 px-6 pb-5 pt-4 text-sm leading-relaxed text-black/65">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden px-6 py-24" style={{ background: 'var(--rose)' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,.2) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.4), transparent 70%)' }} />
        <div className="relative mx-auto max-w-2xl text-center">
          <Gem className="mx-auto mb-6 h-10 w-10 text-white/80" />
          <h2 className="sq-display text-4xl leading-[0.95] text-white sm:text-6xl">
            YOUR CLIENTS DESERVE<br />
            <span style={{ color: 'var(--ink)' }}>THE BEST EXPERIENCE.</span>
          </h2>
          <div className="mx-auto mt-8 mb-2 grid max-w-sm grid-cols-3 gap-4">
            {[
              { v: '8', l: 'tools included' },
              { v: '< 10', l: 'min to set up' },
              { v: '$19.99', l: 'CAD / month' },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white/15 px-3 py-3 text-center">
                <p className="sq-display text-2xl leading-none text-white">{s.v}</p>
                <p className="sq-mono mt-1 text-[9px] uppercase tracking-wide text-white/65">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-md text-lg text-white/85">
            From the first booking to the fifth return visit — SalonQueue handles the follow-up so you can focus on your craft.
          </p>
          <Link
            href="/register"
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-8 py-4 text-base font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Get started for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="sq-mono mt-5 text-xs text-white/70">No credit card · 14-day trial · $19.99 CAD/mo + tax after</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[var(--ink)] px-6 pb-8 pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="inline-flex rounded-xl bg-white/10 p-1.5">
                  <Sparkles className="h-6 w-6" style={{ color: 'var(--rose)' }} />
                </span>
                <span className="sq-display text-xl leading-none text-white">SalonQueue</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-white/55">
                The all-in-one platform for independent beauty salons. Built in Toronto.
              </p>
            </div>

            <div>
              <p className="sq-mono mb-4 text-[11px] font-bold uppercase tracking-widest text-white/40">Product</p>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-white/55 transition-colors hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-sm text-white/55 transition-colors hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="text-sm text-white/55 transition-colors hover:text-white">FAQ</a></li>
                <li><Link href="/login" className="text-sm text-white/55 transition-colors hover:text-white">Sign in</Link></li>
              </ul>
            </div>

            <div>
              <p className="sq-mono mb-4 text-[11px] font-bold uppercase tracking-widest text-white/40">Legal</p>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-sm text-white/55 transition-colors hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="text-sm text-white/55 transition-colors hover:text-white">Terms</Link></li>
                <li><Link href="/refund" className="text-sm text-white/55 transition-colors hover:text-white">Refund policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 sm:flex-row">
            <p className="sq-mono text-[11px] text-white/50">© 2026 SalonQueue · Built for independent beauty salons in Toronto</p>
            <p className="sq-mono flex items-center gap-1.5 text-[11px] text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Service status: operational
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
