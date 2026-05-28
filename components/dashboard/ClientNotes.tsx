'use client'

import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const MAX_LEN = 2000
const DEBOUNCE_MS = 800

export default function ClientNotes({
  clientId,
  initialNotes,
}: {
  clientId: string
  initialNotes: string | null
}) {
  const [value, setValue]   = useState(initialNotes ?? '')
  const [state, setState]   = useState<SaveState>('idle')
  const lastSavedRef        = useRef(initialNotes ?? '')
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (value === lastSavedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setState('idle')
    timerRef.current = setTimeout(async () => {
      setState('saving')
      try {
        const res = await fetch(`/api/clients/${clientId}/notes`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ notes: value || null }),
        })
        if (!res.ok) throw new Error('save failed')
        lastSavedRef.current = value
        setState('saved')
        setTimeout(() => setState(s => (s === 'saved' ? 'idle' : s)), 2000)
      } catch {
        setState('error')
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, clientId])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
          <StickyNote className="w-4 h-4 text-amber-500" />
          Private notes
        </h2>
        <span className="text-xs text-slate-400" role="status">
          {state === 'saving' && 'Saving…'}
          {state === 'saved'  && 'Saved'}
          {state === 'error'  && <span className="text-red-500">Save failed</span>}
        </span>
      </div>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value.slice(0, MAX_LEN))}
        placeholder="Prefers fade #2, allergic to product X, brings his kid…"
        rows={4}
        className="w-full text-sm text-slate-900 placeholder:text-slate-300 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-y"
        aria-label="Private notes about this client"
      />
      <div className="mt-1.5 text-xs text-slate-300 text-right">
        {value.length}/{MAX_LEN}
      </div>
    </div>
  )
}
