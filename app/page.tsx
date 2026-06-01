import Link from 'next/link'
import {
  Scissors, MessageSquare, Gift, RotateCcw, Star,
  ArrowRight, Check, Zap, Bot, CalendarCheck,
  X as XIcon, AlertCircle, TrendingDown, EyeOff,
  Sparkles, ChevronDown,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: CalendarCheck,
    title: 'Online booking link',
    description:
      'Every shop gets a public booking page at yourshop.barberqueue.pro/book. Clients pick a service and a time. You see the request in your dashboard. No phone calls.',
    badge: 'New',
  },
  {
    icon: MessageSquare,
    title: 'No-show recovery',
    description:
      'When a client misses their appointment, BarberQueue texts them automatically with your custom message. Recover the visit — no manual follow-up needed.',
  },
  {
    icon: Gift,
    title: 'Built-in loyalty program',
    description:
      'Clients earn points on every visit and climb from Bronze to Platinum. Automatic rewards that bring them back to your chair, not the shop down the street.',
  },
  {
    icon: RotateCcw,
    title: 'Client reactivation',
    description:
      "Every week, BarberQueue spots clients you haven't seen in 30+ days and sends a personalized message. Automated win-back, while you focus on the cut.",
  },
  {
    icon: Star,
    title: 'Google review requests',
    description:
      '30 minutes after each visit, your client gets a text asking for a Google review. More reviews, higher ranking, more new clients walking in.',
  },
  {
    icon: Bot,
    title: 'AI auto-replies',
    description:
      'When clients text your shop, our AI answers in seconds — booking questions, pricing, hours. You only step in when you want to.',
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
    pain: 'Regulars quietly stop showing up — you only notice months later.',
    fix: 'We spot anyone inactive 30+ days and bring them back with a personalized text.',
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
      'Create your account. Your shop gets its own private dashboard at yourshop.barberqueue.pro — ready in minutes.',
  },
  {
    label: '02',
    title: 'Share your booking link',
    description:
      'Put yourshop.barberqueue.pro/book in your Instagram bio, on your business card, anywhere. Clients book themselves.',
  },
  {
    label: '03',
    title: 'Let BarberQueue work',
    description:
      'Log visits, track clients, and let the automations run. SMS go out on their own. You just keep cutting.',
  },
]

const comparison = [
  { feature: 'Online booking page',          old: 'Pen & paper',     other: true,                ours: true },
  { feature: 'SMS automations',              old: 'Manual or none',  other: 'Coming soon',       ours: true },
  { feature: 'AI auto-replies to texts',     old: false,             other: false,               ours: true },
  { feature: 'Loyalty program',              old: 'Punch cards',     other: false,               ours: '4 tiers' },
  { feature: 'Inactive-client win-back',     old: 'Manual',          other: false,               ours: true },
  { feature: 'Google review requests',       old: false,             other: false,               ours: true },
  { feature: 'Monthly price',                old: '—',               other: '$29–$199 CAD',      ours: 'From $19.99 CAD' },
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
  'Public booking page (yourshop.barberqueue.pro/book)',
  'Unlimited clients',
  'All SMS automations',
  'Loyalty tiers (Bronze → Platinum)',
  'Weekly reactivation campaigns',
  'Automatic Google review requests',
  'AI-powered auto-replies',
  'Private subdomain dashboard',
  'Priority support',
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
    text: 'Hi Marcus, we noticed you missed your appointment at FadeKing today. Want to reschedule? Just reply and we\'ll sort it out.',
    dark: true,
  },
  {
    label: 'New booking',
    text: 'Hey Jordan, your appointment at FadeKing is booked for Monday, May 25 at 2:30 PM — Haircut + beard. See you soon.',
    dark: false,
  },
  {
    label: 'Loyalty milestone',
    text: 'You hit Silver at FadeKing! 100 points earned. Next stop: Gold. See you at your next visit.',
    dark: true,
  },
]

// ─── Cell helpers for comparison table ───────────────────────────────────────

function ComparisonCell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) {
    return (
      <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${highlight ? 'bg-indigo-600' : 'bg-slate-100'}`}>
        <Check className={`w-3.5 h-3.5 ${highlight ? 'text-white' : 'text-slate-500'}`} strokeWidth={3} />
      </div>
    )
  }
  if (value === false) {
    return (
      <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50">
        <XIcon className="w-3.5 h-3.5 text-slate-300" strokeWidth={2.5} />
      </div>
    )
  }
  return (
    <span className={`text-sm ${highlight ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>
      {value}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white scroll-smooth">

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-slate-900 tracking-tight text-lg">BarberQueue</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-slate-900 pt-32 pb-20 px-6 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(79 70 229 / 0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, rgb(15 23 42))' }}
        />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-600/10 text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-indigo-400/20">
                <Zap className="w-3 h-3" />
                Built for independent barbershops · Toronto, Canada
              </div>

              <h1 className="text-5xl sm:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
                Stop chasing<br />
                <span className="text-indigo-400">clients.</span><br />
                Start growing.
              </h1>

              <p className="text-lg text-slate-400 max-w-md mb-10 leading-relaxed">
                Online booking, no-show recovery, loyalty program, and AI auto-replies —
                all in one place. Your shop, on autopilot.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl transition-colors text-sm"
                >
                  Start your 7-day free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm border border-white/10"
                >
                  See how it works
                </a>
              </div>

              <p className="text-slate-600 text-sm mt-5">
                No credit card required · $19.99 CAD/mo + tax after trial · Cancel anytime
              </p>
            </div>

            <div className="hidden lg:flex flex-col gap-3">
              {smsPreview.map((sms) => (
                <div
                  key={sms.label}
                  className={`rounded-2xl p-5 border ${
                    sms.dark
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-indigo-600 border-indigo-300'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-2 ${sms.dark ? 'text-slate-500' : 'text-indigo-100'}`}>
                    {sms.label}
                  </p>
                  <p className={`text-sm leading-relaxed ${sms.dark ? 'text-slate-200' : 'text-white'}`}>
                    {sms.text}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="bg-slate-800 py-3.5 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {[
            'Online booking included',
            'SMS sent automatically',
            'Set up in under 10 minutes',
            'No tech skills required',
          ].map((item) => (
            <span key={item} className="flex items-center gap-2 text-xs text-slate-400">
              <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Problem → Solution ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-3">
              Why barbers switch
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              The 3 leaks every shop has.
              <br />
              <span className="text-slate-400 font-normal">We close them.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {problems.map((p) => (
              <div
                key={p.pain}
                className="bg-slate-50 rounded-2xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-6 md:gap-8 items-start"
              >
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <p.icon className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                    Problem
                  </p>
                  <p className="text-slate-900 font-medium leading-snug">{p.pain}</p>
                </div>
                <div className="md:border-l md:border-slate-200 md:pl-8">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                    BarberQueue fixes it
                  </p>
                  <p className="text-slate-600 leading-snug">{p.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Everything your shop needs.
              <br />
              <span className="text-slate-400 font-normal">Nothing you don&apos;t.</span>
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-base">
              Six tools that run while you work. No setup headaches, no monthly surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7 group hover:shadow-md transition-shadow relative"
              >
                {f.badge && (
                  <span className="absolute top-5 right-5 inline-flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                    <Sparkles className="w-2.5 h-2.5" />
                    {f.badge}
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
                  <f.icon className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Up and running in minutes
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Three steps and you&apos;re live. No developer needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.label} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-5">
                  <span className="text-indigo-400 font-bold text-sm font-mono">{step.label}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-3">
              How we stack up
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              One tool. Half the price.
              <br />
              <span className="text-slate-400 font-normal">Everything the others don&apos;t have.</span>
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-2/5"></th>
                  <th className="px-6 py-5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Old way
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Other booking apps
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-bold text-slate-900 uppercase tracking-wide bg-indigo-50/50 border-x border-indigo-200">
                    BarberQueue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {comparison.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      <ComparisonCell value={row.old} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ComparisonCell value={row.other} />
                    </td>
                    <td className="px-6 py-4 text-center bg-indigo-50/30 border-x border-indigo-100">
                      <ComparisonCell value={row.ours} highlight />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-slate-400 text-xs text-center mt-6">
            Comparison reflects publicly listed plans from major booking-software competitors at the time of writing.
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
              Simple pricing
            </h2>
            <p className="text-slate-500">Two plans. Everything included. No hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

            {/* Solo barber — featured */}
            <div className="bg-slate-900 rounded-2xl p-7 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />

              <div className="flex items-start justify-between mb-4">
                <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">
                  Solo barber
                </p>
                <span className="inline-flex items-center bg-indigo-600/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-500/30 tracking-wide uppercase">
                  Launch — Save 33%
                </span>
              </div>

              {/* Crossed-out regular price */}
              <div className="flex items-end gap-0.5 mb-1.5">
                <span className="text-2xl font-bold text-slate-500 leading-none line-through decoration-slate-500">$29</span>
                <span className="text-slate-500 mb-0.5 text-base font-bold line-through">.99</span>
                <span className="text-slate-500 mb-0.5 text-sm ml-1 line-through">CAD/mo</span>
              </div>

              {/* Launch price */}
              <div className="flex items-end gap-0.5 mb-0.5">
                <span className="text-6xl font-bold text-white leading-none">$19</span>
                <span className="text-white mb-1.5 text-2xl font-bold">.99</span>
                <span className="text-slate-400 mb-1.5 text-lg ml-1">CAD/mo</span>
              </div>
              <p className="text-slate-500 text-xs mb-2">+ applicable taxes</p>
              <p className="text-indigo-400 text-sm font-semibold mb-7">
                7 days free — no credit card required
              </p>

              <ul className="space-y-2.5 mb-7 flex-1">
                {pricingFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-colors text-sm text-center"
              >
                Start 7-day free trial
              </Link>
            </div>

            {/* Multi-barber */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-7 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase">
                  Multi-barber
                </p>
                <span className="inline-flex items-center bg-slate-200 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide uppercase">
                  Team plan
                </span>
              </div>

              <div className="flex items-end gap-0.5 mb-0.5">
                <span className="text-6xl font-bold text-slate-900 leading-none">$29</span>
                <span className="text-slate-900 mb-1.5 text-2xl font-bold">.99</span>
                <span className="text-slate-400 mb-1.5 text-lg ml-1">CAD/mo</span>
              </div>
              <p className="text-slate-400 text-xs mb-2">+ applicable taxes</p>
              <p className="text-slate-500 text-sm font-medium mb-5">
                Everything in Solo, plus team tools:
              </p>

              <ul className="space-y-2.5 flex-1 mb-7">
                {multiBarberFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors text-sm text-center"
              >
                Start 7-day free trial
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-3">
              Frequently asked
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Questions, answered.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <span className="font-medium text-slate-900 text-sm sm:text-base">{item.q}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 pt-0 text-sm text-slate-500 leading-relaxed border-t border-slate-50">
                  <p className="pt-4">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 bg-slate-900 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(79 70 229 / 0.10) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Your clients are waiting.
            <br />
            <span className="text-indigo-400">Don&apos;t let them forget you.</span>
          </h2>
          <p className="text-slate-400 mb-10 text-lg leading-relaxed">
            Join barbershops in Toronto growing their business with BarberQueue.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Get started for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-slate-600 text-sm mt-5">No credit card · 7-day trial · $19.99 CAD/mo + tax after</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 pt-14 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="w-5 h-5 text-indigo-400" />
                <span className="text-white font-bold tracking-tight">BarberQueue</span>
              </div>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                The all-in-one platform for independent barbershops.
                Built in Toronto.
              </p>
            </div>

            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
                Product
              </p>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-slate-500 hover:text-white text-sm transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-slate-500 hover:text-white text-sm transition-colors">Pricing</a></li>
                <li><a href="#faq" className="text-slate-500 hover:text-white text-sm transition-colors">FAQ</a></li>
                <li><Link href="/login" className="text-slate-500 hover:text-white text-sm transition-colors">Sign in</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
                Legal
              </p>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-slate-500 hover:text-white text-sm transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="text-slate-500 hover:text-white text-sm transition-colors">Terms</Link></li>
                <li><Link href="/refund" className="text-slate-500 hover:text-white text-sm transition-colors">Refund policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-600 text-xs text-center sm:text-left">
              © 2026 BarberQueue · Built for independent barbershops in Toronto, Canada
            </p>
            <p className="text-slate-600 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Service status: operational
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
