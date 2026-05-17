import Link from 'next/link'
import {
  Scissors, MessageSquare, Gift, RotateCcw, Star,
  ArrowRight, Check, Zap,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: MessageSquare,
    title: 'No-show recovery',
    description:
      'When a client misses their appointment, BarberPro texts them automatically with your custom message. Recover the visit — no manual follow-up needed.',
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
      "Every week, BarberPro spots clients you haven't seen in 30+ days and sends a personalized message. Automated win-back, while you focus on the cut.",
  },
  {
    icon: Star,
    title: 'Google review requests',
    description:
      '30 minutes after each visit, your client gets a text asking for a Google review. More reviews, higher ranking, more new clients walking in.',
  },
]

const steps = [
  {
    label: '01',
    title: 'Sign up your shop',
    description:
      'Create your account. Your shop gets its own private dashboard at yourshop.barberpro.ca — ready in minutes.',
  },
  {
    label: '02',
    title: 'Connect your number',
    description:
      'Link your Twilio phone number once. Every automation runs through it — no juggling apps or manual texts.',
  },
  {
    label: '03',
    title: 'Let BarberPro work',
    description:
      'Log visits, track clients, and let the automations run. SMS go out on their own. You just keep cutting.',
  },
]

const pricingFeatures = [
  'Unlimited clients',
  'All 4 SMS automations',
  'Loyalty tiers (Bronze → Platinum)',
  'Weekly reactivation campaigns',
  'Automatic Google review requests',
  'AI-powered auto-replies',
  'Private subdomain dashboard',
  'Priority support',
]

const smsPreview = [
  {
    label: 'No-show · 2 min ago',
    text: 'Hi Marcus, we noticed you missed your appointment at FadeKing today. Want to reschedule? Just reply and we\'ll sort it out.',
    dark: true,
  },
  {
    label: 'Loyalty milestone',
    text: 'You hit Silver at FadeKing! 100 points earned. Next stop: Gold. See you at your next visit.',
    dark: false,
  },
  {
    label: 'Reactivation · 45 days inactive',
    text: 'Hey Jordan! It\'s been a while at FadeKing. We\'d love to see you again — book your next appointment anytime.',
    dark: true,
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white scroll-smooth">

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-zinc-900 tracking-tight text-lg">BarberPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-zinc-900 pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Dot grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(251 191 36 / 0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Bottom fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, rgb(24 24 27))' }}
        />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-400/10 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-amber-400/20">
                <Zap className="w-3 h-3" />
                Built for independent barbershops · Toronto, Canada
              </div>

              <h1 className="text-5xl sm:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
                Stop chasing<br />
                <span className="text-amber-400">clients.</span><br />
                Start growing.
              </h1>

              <p className="text-lg text-zinc-400 max-w-md mb-10 leading-relaxed">
                BarberPro handles your no-shows, loyalty program, client reactivation,
                and Google reviews — automatically. You focus on the cut.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold px-6 py-3.5 rounded-xl transition-colors text-sm"
                >
                  Start your 14-day free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm border border-white/10"
                >
                  See how it works
                </a>
              </div>

              <p className="text-zinc-600 text-sm mt-5">
                No credit card required · $10/month after trial · Cancel anytime
              </p>
            </div>

            {/* Right — SMS previews */}
            <div className="hidden lg:flex flex-col gap-3">
              {smsPreview.map((sms) => (
                <div
                  key={sms.label}
                  className={`rounded-2xl p-5 border ${
                    sms.dark
                      ? 'bg-zinc-800 border-zinc-700'
                      : 'bg-amber-400 border-amber-300'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-2 ${sms.dark ? 'text-zinc-500' : 'text-amber-900'}`}>
                    {sms.label}
                  </p>
                  <p className={`text-sm leading-relaxed ${sms.dark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                    {sms.text}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="bg-zinc-800 py-3.5 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {[
            'SMS sent automatically',
            'No tech skills required',
            'Set up in under 10 minutes',
            'Works with your existing number',
          ].map((item) => (
            <span key={item} className="flex items-center gap-2 text-xs text-zinc-400">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight mb-4">
              Everything your shop needs.
              <br />
              <span className="text-zinc-400 font-normal">Nothing you don't.</span>
            </h2>
            <p className="text-zinc-500 max-w-lg mx-auto text-base">
              Four automations that run while you work. No setup headaches, no monthly surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 group hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-5 group-hover:bg-amber-100 transition-colors">
                  <f.icon className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="font-bold text-zinc-900 text-lg mb-2">{f.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight mb-4">
              Up and running in minutes
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Three steps and you're live. No developer needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.label} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center mb-5">
                  <span className="text-amber-400 font-bold text-sm font-mono">{step.label}</span>
                </div>
                <h3 className="font-bold text-zinc-900 text-lg mb-2">{step.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight mb-4">
              Simple pricing
            </h2>
            <p className="text-zinc-500">One plan. Everything included. No surprises.</p>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="bg-zinc-900 rounded-2xl p-8 relative overflow-hidden">
              {/* Amber top accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />

              <p className="text-zinc-400 text-sm font-semibold tracking-widest uppercase mb-4">
                BarberPro
              </p>

              <div className="flex items-end gap-1 mb-1">
                <span className="text-6xl font-bold text-white leading-none">$10</span>
                <span className="text-zinc-400 mb-2 text-lg">/mo</span>
              </div>
              <p className="text-amber-400 text-sm font-semibold mb-8">
                14 days free — no credit card required
              </p>

              <ul className="space-y-3 mb-8">
                {pricingFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="block w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold py-3.5 rounded-xl transition-colors text-sm text-center"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 bg-zinc-900 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(251 191 36 / 0.05) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Your clients are waiting.
            <br />
            <span className="text-amber-400">Don't let them forget you.</span>
          </h2>
          <p className="text-zinc-400 mb-10 text-lg leading-relaxed">
            Join barbershops in Toronto growing their business with BarberPro.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Get started for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-zinc-600 text-sm mt-5">No credit card · 14-day trial · $10/month after</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-zinc-900 border-t border-zinc-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400 text-sm font-bold tracking-tight">BarberPro</span>
          </div>
          <p className="text-zinc-600 text-xs text-center">
            © 2026 BarberPro · Built for independent barbershops in Toronto, Canada
          </p>
          <Link href="/login" className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
            Sign in
          </Link>
        </div>
      </footer>

    </div>
  )
}
