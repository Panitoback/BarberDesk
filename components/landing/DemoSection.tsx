'use client'

import { useEffect, useState } from 'react'
import DemoVideo from './DemoVideo'

const TESTIMONIALS = [
  { name: 'Devon M.',  initials: 'DM', color: '#1a1a2e', text: "Bro my no-shows dropped like crazy since I started using this 🙏" },
  { name: 'Marcus T.', initials: 'MT', color: '#2b2d42', text: "Clients be booking at 2am, I wake up and my calendar's already full 😭" },
  { name: 'Jamal R.',  initials: 'JR', color: '#0f3460', text: "Finally something actually built for barbers. Not some generic software." },
  { name: 'Andre K.',  initials: 'AK', color: '#533483', text: "The AI replies to my texts while I'm cutting. Clients don't even notice lol" },
  { name: 'Kevin O.',  initials: 'KO', color: '#1b4332', text: "Was losing like $200 a week to no-shows. Not anymore bro." },
  { name: 'Chris B.',  initials: 'CB', color: '#7b2d8b', text: "Setup took 20 mins. My whole shop runs itself now fr 🔥" },
  { name: 'Tyrone W.', initials: 'TW', color: '#922b21', text: "My clients actually show up on time now. Wild 😂" },
  { name: 'Isaiah F.', initials: 'IF', color: '#1a5276', text: "Square was eating my bag. This is cheaper and does way more." },
]

const SHOW_MS  = 4500
const FADE_MS  = 500
const GAP_MS   = 1800
const CYCLE    = SHOW_MS + GAP_MS

function Bubble({ slot }: { slot: number }) {
  const [idx, setIdx]         = useState(slot % TESTIMONIALS.length)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    let fadeOut:  ReturnType<typeof setTimeout>

    const init = setTimeout(() => {
      setVisible(true)

      interval = setInterval(() => {
        setVisible(false)
        fadeOut = setTimeout(() => {
          setIdx(i => (i + 4) % TESTIMONIALS.length)
          setVisible(true)
        }, FADE_MS + 100)
      }, CYCLE)
    }, slot * 1500)

    return () => {
      clearTimeout(init)
      clearInterval(interval)
      clearTimeout(fadeOut)
    }
  }, [slot])

  const t = TESTIMONIALS[idx]

  return (
    <div
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        maxWidth:   210,
      }}
      className="bg-white rounded-2xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.09)] border border-black/5"
    >
      <div className="flex items-start gap-2.5">
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: t.color, fontSize: 10 }}
        >
          {t.initials}
        </div>
        <div>
          <p className="font-semibold text-slate-800 leading-none mb-1" style={{ fontSize: 11 }}>
            {t.name}
          </p>
          <p className="text-slate-500 leading-snug" style={{ fontSize: 11 }}>
            {t.text}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DemoSection() {
  return (
    <>
      {/* Desktop: phone centrado con burbujas a los lados */}
      <div
        className="hidden md:grid pb-20"
        style={{ gridTemplateColumns: '1fr 300px 1fr', alignItems: 'center', gap: '2rem' }}
      >
        <div className="flex flex-col gap-6 items-end">
          <Bubble slot={0} />
          <Bubble slot={1} />
        </div>

        <div className="flex justify-center">
          <DemoVideo />
        </div>

        <div className="flex flex-col gap-6 items-start">
          <Bubble slot={2} />
          <Bubble slot={3} />
        </div>
      </div>

      {/* Mobile: solo el teléfono */}
      <div className="md:hidden flex justify-center pb-16">
        <DemoVideo />
      </div>
    </>
  )
}
