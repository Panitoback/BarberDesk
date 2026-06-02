import type { Metadata } from 'next'
import { Anton, Space_Mono, Hanken_Grotesk } from 'next/font/google'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const mono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-shopmono' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken' })

export const metadata: Metadata = {
  title: 'BarberQueue',
}

const POLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, var(--red) 0 12px, #f6f1e6 12px 24px, var(--blue) 24px 36px, #f6f1e6 36px 48px)',
  backgroundSize: '48px 48px',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
    <div className={`${anton.variable} ${mono.variable} ${hanken.variable} relative min-h-screen`} style={rootStyle}>
      <style>{`
        @keyframes bq-pole { from { background-position: 0 0 } to { background-position: 48px 0 } }
        .bq-pole-anim { animation: bq-pole 1.6s linear infinite }
        .bq-display { font-family: var(--font-display); letter-spacing: .01em; }
        .bq-mono { font-family: var(--font-shopmono); }
        @media (prefers-reduced-motion: reduce) { .bq-pole-anim { animation: none !important } }
      `}</style>

      {/* barber pole strip at the very top */}
      <span aria-hidden className="bq-pole-anim absolute inset-x-0 top-0 z-10 block h-1.5" style={POLE} />

      {/* faint dotted texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(22,17,13,.05) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
      />

      <div className="relative">{children}</div>
    </div>
  )
}
