import Link from 'next/link'
import Image from 'next/image'
import { Anton, Space_Mono, Hanken_Grotesk } from 'next/font/google'
import {
  Scissors, MessageSquare, Gift, RotateCcw, Star,
  ArrowRight, Check, Bot, CalendarCheck,
  X as XIcon, AlertCircle, TrendingDown, EyeOff,
  Sparkles, ChevronDown, Bell, Clock, Users, TrendingUp,
} from 'lucide-react'

// ─── Fonts (landing-only, barbershop signage pairing) ─────────────────────────

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const mono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-shopmono' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken' })

// ─── Shared visual tokens ─────────────────────────────────────────────────────

const POLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, var(--red) 0 12px, #f6f1e6 12px 24px, var(--blue) 24px 36px, #f6f1e6 36px 48px)',
  backgroundSize: '48px 48px',
}

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: CalendarCheck,
    title: 'Online booking link',
    description:
      'Every shop gets a public page at yourshop.barberqueue.pro/book. Clients pick a service and a time — you see it land in your dashboard. No phone tag.',
    badge: 'New',
  },
  {
    icon: MessageSquare,
    title: 'No-show recovery',
    description:
      'Miss happens. The second a client no-shows, BarberQueue texts them your custom message. Most reschedule on the spot.',
  },
  {
    icon: Gift,
    title: 'Loyalty program',
    description:
      'Clients earn points every visit and climb Bronze → Platinum. Rewards that pull them back to your chair, not the shop down the block.',
  },
  {
    icon: RotateCcw,
    title: 'Client win-back',
    description:
      "Every week we spot anyone you haven't seen in 30+ days and send a personal nudge. Automated reactivation while you keep cutting.",
  },
  {
    icon: Star,
    title: 'Google review requests',
    description:
      '30 minutes after each cut, your client gets a text asking for a Google review. More stars, higher ranking, more walk-ins.',
  },
  {
    icon: Bot,
    title: 'AI auto-replies',
    description:
      'When clients text your shop, the AI answers in seconds — hours, pricing, booking. You step in only when you want to.',
  },
]

const problems = [
  {
    icon: TrendingDown,
    pain: 'Clients miss appointments. You eat the empty chair.',
    fix: 'Auto-text recovery the moment a no-show happens — most clients reschedule on the spot.',
  },
  {
    icon: EyeOff,
    pain: 'Regulars quietly stop showing up — you notice months later.',
    fix: 'We flag anyone inactive 30+ days and win them back with a personalized text.',
  },
  {
    icon: AlertCircle,
    pain: 'Your competitor has 200 Google reviews. You have 12.',
    fix: 'Every happy client gets an automatic review request 30 minutes after the cut.',
  },
]

const steps = [
  {
    label: '01',
    title: 'Sign up your shop',
    description:
      'Create your account. Your shop gets its own dashboard at yourshop.barberqueue.pro — live in minutes.',
  },
  {
    label: '02',
    title: 'Share your link',
    description:
      'Drop yourshop.barberqueue.pro/book in your Instagram bio, on your card, anywhere. Clients book themselves.',
  },
  {
    label: '03',
    title: 'Let it run',
    description:
      'Log visits, track clients, and let the automations fire. The texts go out on their own. You just keep cutting.',
  },
]

const comparison = [
  { feature: 'Online booking page',           old: 'Pen & paper',    other: true,           ours: true },
  { feature: 'No-show SMS recovery',          old: 'Manual',         other: false,          ours: true },
  { feature: 'SMS automations',               old: 'Manual or none', other: 'Coming soon',  ours: true },
  { feature: 'AI auto-replies to texts',      old: false,            other: false,          ours: true },
  { feature: 'Loyalty program',               old: 'Punch cards',    other: false,          ours: '4 tiers' },
  { feature: 'Inactive-client win-back',      old: 'Manual',         other: false,          ours: true },
  { feature: 'Google review requests',        old: false,            other: false,          ours: true },
  { feature: 'Online payments & deposits',    old: false,            other: 'Paid add-on',  ours: true },
  { feature: 'Waitlist management',           old: false,            other: false,          ours: true },
  { feature: 'Monthly price',                 old: '—',              other: '$29–$199 CAD', ours: 'From $19.99' },
] satisfies ReadonlyArray<{
  feature: string
  old: string | boolean
  other: string | boolean
  ours: string | boolean
}>

const faqs = [
  {
    q: 'Do I need to be technical to set this up?',
    a: 'No. Sign-up takes about 10 minutes. Everything is ready to go — no third-party accounts, no extra setup.',
  },
  {
    q: 'Can my clients book online without calling me?',
    a: 'Yes. Every shop gets a booking page at yourshop.barberqueue.pro/book. Share it on Instagram, on your business card, or in your Google Business profile. New bookings show up in your dashboard.',
  },
  {
    q: 'Do I need to set up an SMS provider?',
    a: 'No. SMS is fully included in your plan — we handle the phone number, the carrier, and the delivery. You just write your messages and we send them.',
  },
  {
    q: 'What happens after the 7-day free trial?',
    a: '$19.99 CAD/month + applicable taxes, billed monthly. Cancel anytime — no contracts, no penalties.',
  },
  {
    q: 'Will my clients get spammed?',
    a: 'No. Every automation has a clear trigger (a no-show, an inactive period, a completed visit) and you can pause any of them with one click.',
  },
  {
    q: 'What if a no-show was actually a miscommunication?',
    a: 'The recovery text is gentle by default — it just asks if they want to reschedule. You can customize the wording in your dashboard.',
  },
  {
    q: 'Can I export my client data?',
    a: 'Yes. Your data is yours. A one-click export from the dashboard is on the roadmap; in the meantime we can send it to you on request.',
  },
  {
    q: 'Do you support multiple shops on one account?',
    a: 'One shop per subscription today. Multi-location is on the roadmap — let us know if you need it sooner.',
  },
]

const pricingFeatures = [
  'Public booking page',
  'Unlimited clients & visit history',
  'No-show SMS recovery',
  'Loyalty program — Bronze to Platinum',
  'Inactive client win-back',
  'Google review requests',
  'AI-powered SMS auto-replies',
  'Online payments & deposits (Stripe)',
  'Client self-cancel portal',
  'Waitlist management',
  'Private subdomain dashboard',
]

const multiBarberFeatures = [
  'Unlimited barbers on your roster',
  'Per-barber custom schedule & hours',
  'Per-barber Instagram link on booking page',
  'Per-barber photo & bio',
  'Revenue & visit tracking per barber',
  'Read-only staff schedule link (no login)',
  'Booking email notifications per barber',
]

const smsPreview = [
  {
    label: 'No-show · 2 min ago',
    text: "Hi Marcus, we noticed you missed your appointment at FadeKing today. Want to reschedule? Just reply and we'll sort it out.",
    inbound: false,
  },
  {
    label: 'New booking',
    text: 'Hey Jordan — your appointment at FadeKing is booked for Mon, May 25 at 2:30 PM. Haircut + beard. See you soon.',
    inbound: true,
  },
  {
    label: 'Loyalty milestone',
    text: 'You hit Silver at FadeKing! 100 points earned. Next stop: Gold. See you at your next visit.',
    inbound: false,
  },
]

// Mock data for the analytics showcase
const revenueWeeks = [
  { label: 'Apr 7',  v: 38 }, { label: 'Apr 14', v: 52 }, { label: 'Apr 21', v: 47 },
  { label: 'Apr 28', v: 61 }, { label: 'May 5',  v: 58 }, { label: 'May 12', v: 74 },
  { label: 'May 19', v: 83 }, { label: 'This wk', v: 96 },
]
const heatHours = [10, 22, 35, 41, 30, 18, 12, 26, 48, 67, 84, 92, 70, 44]
const topServices = [
  { name: 'Haircut',          v: 100 },
  { name: 'Haircut + beard',  v: 78 },
  { name: 'Fade',             v: 61 },
  { name: 'Beard trim',       v: 34 },
  { name: 'Kids cut',         v: 19 },
]

// ─── Cell helper for comparison table ─────────────────────────────────────────

function ComparisonCell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full"
        style={highlight ? { background: 'var(--red)' } : { background: 'rgba(0,0,0,0.06)' }}
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
      style={{ fontFamily: 'var(--font-shopmono)', color: highlight ? 'var(--red)' : 'rgba(0,0,0,0.45)' }}
    >
      {value}
    </span>
  )
}

// ─── Mockups ──────────────────────────────────────────────────────────────────

function DashboardMock() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
      {/* browser chrome */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#1d1814] border-b border-black/30">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--red)' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--blue)' }} />
        <span className="ml-3 flex-1 truncate rounded-md bg-white/10 px-2.5 py-1 text-[10px] text-white/50" style={{ fontFamily: 'var(--font-shopmono)' }}>
          fadeking.barberqueue.pro
        </span>
      </div>
      <div className="flex">
        {/* sidebar */}
        <div className="hidden sm:flex w-32 shrink-0 flex-col gap-1 bg-[#1d1814] p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} />
            <span className="text-[10px] font-bold text-white">FadeKing</span>
          </div>
          {['Dashboard', 'Agenda', 'Clients', 'Messages', 'Analytics', 'Settings'].map((n, i) => (
            <div
              key={n}
              className="rounded-md px-2 py-1 text-[9px] font-medium"
              style={i === 0 ? { background: 'var(--red)', color: '#fff' } : { color: 'rgba(255,255,255,0.45)' }}
            >
              {n}
            </div>
          ))}
        </div>
        {/* content */}
        <div className="flex-1 bg-[#f6f4ef] p-3.5 sm:p-4">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { l: 'Today', v: '8', s: 'appointments' },
              { l: 'Revenue', v: '$340', s: 'today' },
              { l: 'Clients', v: '214', s: 'registered' },
            ].map((c) => (
              <div key={c.l} className="rounded-lg bg-white p-2.5 ring-1 ring-black/5">
                <p className="text-[8px] uppercase tracking-wider text-black/40" style={{ fontFamily: 'var(--font-shopmono)' }}>{c.l}</p>
                <p className="text-lg font-extrabold leading-tight text-[#1d1814]">{c.v}</p>
                <p className="text-[8px] text-black/35">{c.s}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-white p-3 ring-1 ring-black/5">
            <p className="mb-2 text-[10px] font-bold text-[#1d1814]">Today&apos;s appointments</p>
            <div className="space-y-1.5">
              {[
                { t: '10:00', n: 'Marcus W.', s: 'Fade + beard', c: 'var(--red)' },
                { t: '11:30', n: 'Jordan P.', s: 'Haircut', c: 'var(--blue)' },
                { t: '13:00', n: 'Andre K.', s: 'Beard trim', c: '#16110d' },
              ].map((a) => (
                <div key={a.t} className="flex items-center gap-2 rounded-md bg-[#f6f4ef] px-2 py-1.5">
                  <span className="w-1 self-stretch rounded-full" style={{ background: a.c }} />
                  <span className="text-[9px] font-bold tabular-nums text-black/55" style={{ fontFamily: 'var(--font-shopmono)' }}>{a.t}</span>
                  <span className="text-[10px] font-semibold text-[#1d1814]">{a.n}</span>
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
    <div className="w-[170px] rounded-[26px] bg-[#1d1814] p-1.5 shadow-2xl ring-1 ring-white/10">
      <div className="overflow-hidden rounded-[20px] bg-[#f6f4ef]">
        <div className="relative bg-[#1d1814] px-3 pb-4 pt-3 text-center">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
          <p className="text-[11px] font-bold text-white">FadeKing Barbershop</p>
          <p className="text-[8px] text-white/45" style={{ fontFamily: 'var(--font-shopmono)' }}>Book your cut</p>
        </div>
        <div className="space-y-2 p-2.5">
          <p className="text-[8px] font-bold uppercase tracking-wider text-black/40" style={{ fontFamily: 'var(--font-shopmono)' }}>Pick your barber</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[{ n: 'Tony', on: true }, { n: 'Rico', on: false }].map((b) => (
              <div
                key={b.n}
                className="rounded-lg p-1.5 text-center"
                style={b.on
                  ? { background: 'var(--red)', color: '#fff' }
                  : { background: '#fff', color: '#1d1814', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
              >
                <div className="mx-auto mb-1 h-6 w-6 rounded-full" style={{ background: b.on ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)' }} />
                <p className="text-[9px] font-bold">{b.n}</p>
              </div>
            ))}
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-black/40" style={{ fontFamily: 'var(--font-shopmono)' }}>Available today</p>
          <div className="grid grid-cols-3 gap-1.5">
            {['10:00', '11:30', '1:00', '2:30', '3:00', '4:30'].map((t, i) => (
              <div
                key={t}
                className="rounded-md py-1 text-center text-[8px] font-bold tabular-nums"
                style={i === 3
                  ? { background: 'var(--blue)', color: '#fff', fontFamily: 'var(--font-shopmono)' }
                  : { background: '#fff', color: '#1d1814', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)', fontFamily: 'var(--font-shopmono)' }}
              >
                {t}
              </div>
            ))}
          </div>
          <button className="w-full rounded-lg py-2 text-[9px] font-bold text-white" style={{ background: 'var(--red)' }}>
            Confirm booking →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const rootStyle = {
    '--ink': '#16110d',
    '--paper': '#f3ead7',
    '--paper-2': '#ece0c8',
    '--red': '#d8232a',
    '--blue': '#1d4f93',
    '--gold': '#c89b3c',
    fontFamily: 'var(--font-hanken)',
    background: 'var(--paper)',
    color: 'var(--ink)',
  } as React.CSSProperties

  return (
    <div className={`${anton.variable} ${mono.variable} ${hanken.variable} min-h-screen scroll-smooth`} style={rootStyle}>

      <style>{`
        @keyframes bq-pole { from { background-position: 0 0 } to { background-position: 0 48px } }
        @keyframes bq-rise { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: none } }
        @keyframes bq-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes bq-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes bq-grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        .bq-rise { animation: bq-rise .8s cubic-bezier(.16,1,.3,1) both }
        .bq-pole-anim { animation: bq-pole 1.6s linear infinite }
        .bq-float { animation: bq-float 6s ease-in-out infinite }
        .bq-bar { transform-origin: bottom; animation: bq-grow .9s cubic-bezier(.16,1,.3,1) both }
        @media (prefers-reduced-motion: reduce) {
          .bq-rise,.bq-pole-anim,.bq-float,.bq-bar { animation: none !important }
        }
        .bq-display { font-family: var(--font-display); letter-spacing: .01em; }
        .bq-mono { font-family: var(--font-shopmono); }
      `}</style>

      {/* ── Nav ── */}
      <header
        className="fixed inset-x-0 top-0 z-50 border-b-2 border-[var(--ink)] backdrop-blur-md"
        style={{ background: 'rgba(243,234,215,0.92)' }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={40} height={40} priority className="h-9 w-9" />
            <span className="bq-display text-xl leading-none text-[var(--ink)]">BarberQueue</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-[var(--ink)] transition-colors hover:text-[var(--red)]">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--red)' }}
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section data-nav-dark className="relative overflow-hidden bg-[var(--ink)] px-6 pb-24 pt-28 sm:pt-32">
        {/* spinning barber pole — left edge */}
        <span aria-hidden className="bq-pole-anim absolute inset-y-0 left-0 hidden w-3 opacity-90 md:block" style={POLE} />
        {/* dotted texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        {/* warm glow */}
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-24 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(216,35,42,.28), transparent 70%)' }} />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_1.05fr]">

            <div>
              <div className="bq-rise mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--paper)]" style={{ fontFamily: 'var(--font-shopmono)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--red)' }} />
                For independent shops · Toronto
              </div>

              <h1 className="bq-display bq-rise text-6xl leading-[0.92] text-[var(--paper)] sm:text-7xl" style={{ animationDelay: '.08s' }}>
                STOP CHASING<br />
                <span style={{ color: 'var(--red)' }}>CLIENTS.</span><br />
                START <span style={{ color: 'var(--gold)' }}>GROWING.</span>
              </h1>

              <p className="bq-rise mt-7 max-w-md text-lg leading-relaxed text-white/65" style={{ animationDelay: '.16s' }}>
                Online booking, no-show recovery, loyalty rewards, and AI auto-replies —
                all in one place. Your shop, on autopilot.
              </p>

              <div className="bq-rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '.24s' }}>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--red)' }}
                >
                  Start your 7-day free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  See how it works
                </a>
              </div>

              <p className="bq-rise mt-5 text-xs text-white/55" style={{ animationDelay: '.32s' }}>
                No credit card · $19.99 CAD/mo + tax after trial · Cancel anytime
              </p>
            </div>

            {/* product mockups */}
            <div className="bq-rise relative" style={{ animationDelay: '.2s' }}>
              <DashboardMock />
              <div className="bq-float absolute -bottom-10 -left-4 hidden sm:block" style={{ animationDelay: '.5s' }}>
                <PhoneMock />
              </div>
              {/* floating SMS notification */}
              <div className="bq-float absolute -right-3 -top-6 hidden w-56 rounded-2xl bg-white p-3.5 shadow-2xl ring-1 ring-black/5 sm:block">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'var(--red)' }}>
                    <Bell className="h-2.5 w-2.5 text-white" />
                  </span>
                  <span className="bq-mono text-[9px] font-bold uppercase tracking-wider text-black/40">No-show · just now</span>
                </div>
                <p className="text-[11px] leading-snug text-[#1d1814]">
                  Hi Marcus — missed you today at FadeKing. Want to reschedule? Reply and we&apos;ll sort it out.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust marquee ── */}
      <div data-nav-dark className="overflow-hidden border-y-2 border-[var(--ink)] py-3" style={{ background: 'var(--red)' }}>
        <div className="bq-marquee flex w-max" style={{ animation: 'bq-marquee 28s linear infinite' }}>
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
              {[
                'Online booking included', 'SMS sent automatically', 'Set up in under 10 minutes',
                'No tech skills required', 'Loyalty built in', 'AI answers your texts', 'Reviews on autopilot',
              ].map((item) => (
                <span key={item} className="bq-mono flex items-center gap-3 px-6 text-sm font-bold uppercase tracking-wide text-white">
                  {item}
                  <Scissors className="h-3.5 w-3.5 text-white/70" />
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
            <p className="bq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--red)' }}>
              Why barbers switch
            </p>
            <h2 className="bq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">
              THE 3 LEAKS EVERY SHOP HAS.<br />
              <span style={{ color: 'var(--blue)' }}>WE CLOSE THEM.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {problems.map((p) => (
              <div
                key={p.pain}
                className="grid grid-cols-1 items-start gap-6 rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-6 sm:p-8 md:grid-cols-[auto_1fr_1fr] md:gap-8"
                style={{ boxShadow: '5px 5px 0 var(--ink)' }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--red)' }}>
                  <p.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="bq-mono mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--red)' }}>The problem</p>
                  <p className="font-bold leading-snug text-[var(--ink)]">{p.pain}</p>
                </div>
                <div className="md:border-l-2 md:border-[var(--ink)]/15 md:pl-8">
                  <p className="bq-mono mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--blue)' }}>We fix it</p>
                  <p className="leading-snug text-black/65">{p.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (bento) ── */}
      <section id="features" data-nav-dark className="bg-[var(--ink)] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="bq-display text-4xl leading-none text-[var(--paper)] sm:text-5xl">
              EVERYTHING YOUR SHOP NEEDS.<br />
              <span className="text-white/35">NOTHING IT DOESN&apos;T.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/50">
              Six tools that run while you work. No setup headaches, no monthly surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:bg-white/[0.06] ${i === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
              >
                {f.badge && (
                  <span className="bq-mono absolute right-5 top-5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: 'var(--red)' }}>
                    <Sparkles className="h-2.5 w-2.5" />
                    {f.badge}
                  </span>
                )}
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: i % 2 ? 'rgba(29,79,147,0.22)' : 'rgba(216,35,42,0.2)' }}>
                  <f.icon className="h-5 w-5" style={{ color: i % 2 ? '#6ea1e0' : '#f08a8e' }} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--paper)]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{f.description}</p>
                <span aria-hidden className="absolute -bottom-px left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full" style={{ background: 'var(--red)' }} />
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
              <p className="bq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--red)' }}>
                Know your numbers
              </p>
              <h2 className="bq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">
                SEE EXACTLY WHAT&apos;S<br />
                <span style={{ color: 'var(--blue)' }}>MAKING YOU MONEY.</span>
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-black/65">
                A live dashboard tracks revenue week by week, your busiest hours, your
                top services, and your no-show rate — so you know when to staff up and what to push.
              </p>
              <div className="mt-7 grid grid-cols-3 gap-3">
                {[
                  { icon: TrendingUp, l: 'Revenue this month', v: '$4,820' },
                  { icon: Clock, l: 'Busiest hour', v: '6 PM' },
                  { icon: Users, l: 'Registered clients', v: '214' },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-3" style={{ boxShadow: '4px 4px 0 var(--ink)' }}>
                    <s.icon className="mb-1.5 h-4 w-4" style={{ color: 'var(--red)' }} />
                    <p className="text-xl font-extrabold leading-none text-[var(--ink)]">{s.v}</p>
                    <p className="bq-mono mt-1 text-[9px] uppercase leading-tight tracking-wide text-black/45">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* charts card */}
            <div className="rounded-2xl border-2 border-[var(--ink)] bg-white p-5 sm:p-6" style={{ boxShadow: '7px 7px 0 var(--ink)' }}>
              {/* revenue trend */}
              <p className="text-sm font-bold text-[#1d1814]">Revenue · last 8 weeks</p>
              <p className="bq-mono mb-4 text-[10px] uppercase tracking-wide text-black/35">From completed visits</p>
              <div className="flex h-28 items-end gap-2">
                {revenueWeeks.map((w, i) => (
                  <div key={w.label} className="group flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="bq-bar w-full rounded-t-sm"
                        style={{
                          height: `${w.v}%`,
                          background: i === revenueWeeks.length - 1 ? 'var(--red)' : 'var(--blue)',
                          animationDelay: `${i * 0.06}s`,
                          opacity: i === revenueWeeks.length - 1 ? 1 : 0.55 + i * 0.05,
                        }}
                      />
                    </div>
                    <span className="bq-mono text-[7px] text-black/35">{w.label}</span>
                  </div>
                ))}
              </div>

              <div className="my-5 h-px bg-black/10" />

              {/* busiest hours heatmap */}
              <p className="text-sm font-bold text-[#1d1814]">Busiest times</p>
              <p className="bq-mono mb-3 text-[10px] uppercase tracking-wide text-black/35">8 AM – 9 PM</p>
              <div className="flex gap-1">
                {heatHours.map((h, i) => (
                  <div key={i} className="flex-1">
                    <div
                      className="h-8 rounded-sm"
                      style={{ background: `color-mix(in srgb, var(--red) ${Math.max(8, h)}%, #efe7d6)` }}
                      title={`${8 + i}:00 — ${h} bookings`}
                    />
                  </div>
                ))}
              </div>

              <div className="my-5 h-px bg-black/10" />

              {/* top services */}
              <p className="text-sm font-bold text-[#1d1814]">Top services · 30 days</p>
              <div className="mt-3 space-y-1.5">
                {topServices.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[10px] font-semibold text-black/60">{s.name}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="bq-bar h-full rounded-full"
                        style={{ width: `${s.v}%`, background: i === 0 ? 'var(--red)' : 'var(--blue)', transformOrigin: 'left', animationDelay: `${i * 0.08}s` }}
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
            <h2 className="bq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">UP AND RUNNING IN MINUTES</h2>
            <p className="mx-auto mt-4 max-w-md text-black/55">Three steps and you&apos;re live. No developer needed.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.label} className="relative rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] p-7" style={{ boxShadow: '5px 5px 0 var(--ink)' }}>
                <span className="bq-display mb-4 block text-6xl leading-none" style={{ color: i === 0 ? 'var(--red)' : i === 1 ? 'var(--blue)' : 'var(--gold)' }}>
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
      <section data-nav-dark className="relative overflow-hidden bg-[var(--ink)] px-6 py-24">
        <span aria-hidden className="bq-pole-anim absolute inset-y-0 right-0 hidden w-3 opacity-80 md:block" style={POLE} />
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="bq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--gold)' }}>
              The texts write themselves
            </p>
            <h2 className="bq-display text-4xl leading-none text-[var(--paper)] sm:text-5xl">YOUR SHOP, TALKING FOR YOU.</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {smsPreview.map((sms, i) => (
              <div key={sms.label} className="bq-float rounded-2xl bg-[#241d16] p-5 ring-1 ring-white/10" style={{ animationDelay: `${i * 0.4}s` }}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: sms.inbound ? 'var(--blue)' : 'var(--red)' }}>
                    <MessageSquare className="h-3 w-3 text-white" />
                  </span>
                  <span className="bq-mono text-[10px] font-bold uppercase tracking-wider text-white/40">{sms.label}</span>
                </div>
                <div
                  className="rounded-2xl px-3.5 py-3 text-sm leading-relaxed"
                  style={sms.inbound
                    ? { background: 'var(--blue)', color: '#fff', borderBottomLeftRadius: 4 }
                    : { background: '#fff', color: '#1d1814', borderBottomRightRadius: 4 }}
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
            <p className="bq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--red)' }}>How we stack up</p>
            <h2 className="bq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">
              MORE FEATURES. HALF THE PRICE.
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-[var(--ink)] bg-white" style={{ boxShadow: '7px 7px 0 var(--ink)' }}>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--ink)]">
                  <th className="w-2/5 px-6 py-5 text-left" />
                  <th className="bq-mono px-6 py-5 text-center text-[11px] font-bold uppercase tracking-wide text-black/40">Old way</th>
                  <th className="bq-mono px-6 py-5 text-center text-[11px] font-bold uppercase tracking-wide text-black/40">Other apps</th>
                  <th className="bq-mono border-x-2 border-[var(--ink)] px-6 py-5 text-center text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: 'var(--ink)' }}>
                    BarberQueue
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b border-black/5 last:border-0">
                    <td className="px-6 py-4 font-semibold text-[var(--ink)]">{row.feature}</td>
                    <td className="px-6 py-4 text-center"><ComparisonCell value={row.old} /></td>
                    <td className="px-6 py-4 text-center"><ComparisonCell value={row.other} /></td>
                    <td className="border-x-2 border-[var(--ink)] px-6 py-4 text-center" style={{ background: 'rgba(216,35,42,0.06)' }}>
                      <ComparisonCell value={row.ours} highlight />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="bq-mono mt-6 text-center text-[11px] text-black/40">
            Comparison reflects publicly listed competitor plans at the time of writing.
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" data-nav-dark className="bg-[var(--ink)] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="bq-display text-4xl leading-none text-[var(--paper)] sm:text-5xl">SIMPLE PRICING</h2>
            <p className="mt-3 text-white/50">Two plans. Everything included. No hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">

            {/* Solo — featured */}
            <div className="relative flex flex-col overflow-hidden rounded-2xl bg-[var(--paper)] p-7" style={{ boxShadow: '8px 8px 0 var(--red)' }}>
              <span aria-hidden className="bq-pole-anim absolute inset-x-0 top-0 h-2" style={POLE} />
              <div className="mb-4 mt-1 flex items-start justify-between">
                <p className="bq-mono text-xs font-bold uppercase tracking-widest text-black/45">Solo barber</p>
                <span className="bq-mono rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: 'var(--red)' }}>
                  Launch — save 33%
                </span>
              </div>

              <div className="mb-1 flex items-end gap-0.5">
                <span className="bq-mono text-xl font-bold leading-none text-black/35 line-through">$29.99</span>
                <span className="bq-mono mb-0.5 ml-1 text-xs text-black/35 line-through">CAD/mo</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="bq-display text-7xl leading-[0.8] text-[var(--ink)]">$19</span>
                <span className="bq-display mb-1 text-3xl text-[var(--ink)]">.99</span>
                <span className="mb-2 ml-1 text-base text-black/50">CAD/mo</span>
              </div>
              <p className="mb-1 text-xs text-black/45">+ applicable taxes</p>
              <p className="mb-7 text-sm font-bold" style={{ color: 'var(--red)' }}>7 days free — no credit card</p>

              <ul className="mb-7 flex-1 space-y-2.5">
                {pricingFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-black/70">
                    <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--red)' }} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition-transform hover:-translate-y-0.5" style={{ background: 'var(--red)' }}>
                Start 7-day free trial
              </Link>
            </div>

            {/* Multi-barber */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7">
              <div className="mb-4 flex items-start justify-between">
                <p className="bq-mono text-xs font-bold uppercase tracking-widest text-white/45">Multi-barber</p>
                <span className="bq-mono rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
                  Launch — save 40%
                </span>
              </div>

              <div className="mb-1 flex items-end gap-0.5">
                <span className="bq-mono text-xl font-bold leading-none text-white/35 line-through">$49.99</span>
                <span className="bq-mono mb-0.5 ml-1 text-xs text-white/35 line-through">CAD/mo</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="bq-display text-7xl leading-[0.8] text-[var(--paper)]">$29</span>
                <span className="bq-display mb-1 text-3xl text-[var(--paper)]">.99</span>
                <span className="mb-2 ml-1 text-base text-white/45">CAD/mo</span>
              </div>
              <p className="mb-1 text-xs text-white/40">+ applicable taxes</p>
              <p className="mb-1 text-sm font-bold" style={{ color: 'var(--gold)' }}>7 days free — no credit card</p>
              <p className="mb-5 text-sm text-white/55">Everything in Solo, plus team tools:</p>

              <ul className="mb-7 flex-1 space-y-2.5">
                {multiBarberFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white/70">
                    <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--gold)' }} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="block w-full rounded-xl border border-white/20 bg-white/5 py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-white/10">
                Start 7-day free trial
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="bq-mono mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--red)' }}>Frequently asked</p>
            <h2 className="bq-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">QUESTIONS, ANSWERED.</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((item) => (
              <details key={item.q} className="group overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper-2)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-black/[0.03]">
                  <span className="text-sm font-bold text-[var(--ink)] sm:text-base">{item.q}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: 'var(--red)' }} />
                </summary>
                <div className="border-t border-black/10 px-6 pb-5 pt-4 text-sm leading-relaxed text-black/65">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section data-nav-dark className="relative overflow-hidden px-6 py-24" style={{ background: 'var(--red)' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,.18) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <Scissors className="mx-auto mb-6 h-10 w-10 text-white/80" />
          <h2 className="bq-display text-4xl leading-[0.95] text-white sm:text-6xl">
            YOUR CLIENTS ARE WAITING.<br />
            <span className="text-[var(--ink)]">DON&apos;T LET THEM FORGET YOU.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-white/85">
            Join barbershops across Toronto running their business on autopilot.
          </p>
          <Link
            href="/register"
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-8 py-4 text-base font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Get started for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="bq-mono mt-5 text-xs text-white/70">No credit card · 7-day trial · $19.99 CAD/mo + tax after</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer data-nav-dark className="bg-[var(--ink)] px-6 pb-8 pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="inline-flex rounded-xl bg-white p-1.5">
                  <Image src="/logo.png" alt="" width={32} height={32} className="h-7 w-7" />
                </span>
                <span className="bq-display text-xl leading-none text-white">BarberQueue</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-white/55">
                The all-in-one platform for independent barbershops. Built in Toronto.
              </p>
            </div>

            <div>
              <p className="bq-mono mb-4 text-[11px] font-bold uppercase tracking-widest text-white/40">Product</p>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-white/55 transition-colors hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-sm text-white/55 transition-colors hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="text-sm text-white/55 transition-colors hover:text-white">FAQ</a></li>
                <li><Link href="/login" className="text-sm text-white/55 transition-colors hover:text-white">Sign in</Link></li>
              </ul>
            </div>

            <div>
              <p className="bq-mono mb-4 text-[11px] font-bold uppercase tracking-widest text-white/40">Legal</p>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-sm text-white/55 transition-colors hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="text-sm text-white/55 transition-colors hover:text-white">Terms</Link></li>
                <li><Link href="/refund" className="text-sm text-white/55 transition-colors hover:text-white">Refund policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 sm:flex-row">
            <p className="bq-mono text-[11px] text-white/50">© 2026 BarberQueue · Built for independent barbershops in Toronto</p>
            <p className="bq-mono flex items-center gap-1.5 text-[11px] text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Service status: operational
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
