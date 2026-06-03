'use client'

import { useRef, useState } from 'react'

const VIDEO_URL =
  'https://gjefeiwsvcjroklvkbuk.supabase.co/storage/v1/object/public/landing-assets/demo.mp4'

// Phone dimensions: 280px wide, 9:19.5 ratio → 607px tall
const W = 280
const H = Math.round(W * 19.5 / 9) // 607

export default function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)

  function toggleMute() {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(videoRef.current.muted)
  }

  return (
    <div style={{ position: 'relative', width: W, flexShrink: 0 }}>
      {/* Phone body */}
      <div style={{
        position: 'relative',
        width: W,
        height: H,
        overflow: 'hidden',
        borderRadius: '2.5rem',
        border: '6px solid #0f0f0f',
        background: '#0f0f0f',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 8, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', zIndex: 10,
        }}>
          <div style={{ width: 96, height: 20, borderRadius: 9999, background: '#0f0f0f' }} />
        </div>

        {/* Video */}
        <video
          ref={videoRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
        />
      </div>

      {/* Side buttons */}
      <div style={{ position: 'absolute', left: -5, top: 80,  width: 5, height: 32, borderRadius: '4px 0 0 4px', background: '#0f0f0f' }} />
      <div style={{ position: 'absolute', left: -5, top: 128, width: 5, height: 48, borderRadius: '4px 0 0 4px', background: '#0f0f0f' }} />
      <div style={{ position: 'absolute', left: -5, top: 192, width: 5, height: 48, borderRadius: '4px 0 0 4px', background: '#0f0f0f' }} />
      <div style={{ position: 'absolute', right: -5, top: 112, width: 5, height: 64, borderRadius: '0 4px 4px 0', background: '#0f0f0f' }} />

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        style={{ position: 'absolute', bottom: -52, left: '50%', transform: 'translateX(-50%)' }}
        className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold shadow-sm transition hover:bg-slate-50 whitespace-nowrap"
        aria-label={muted ? 'Unmute video' : 'Mute video'}
      >
        {muted ? (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
              <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
            Tap for sound
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9a4 4 0 010 6M15 7a7 7 0 010 10" />
            </svg>
            Mute
          </>
        )}
      </button>
    </div>
  )
}
