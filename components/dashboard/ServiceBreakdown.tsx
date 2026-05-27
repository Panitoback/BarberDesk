'use client'

import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import type { VisitExtra } from '@/lib/extras'

interface Props {
  service: string
  basePrice: number | null
  extras: VisitExtra[]
  total: number | null
}

export default function ServiceBreakdown({ service, basePrice, extras, total }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (extras.length === 0) return null

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="View service breakdown"
        className="inline-flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2 mt-1 w-56 bg-white rounded-xl shadow-lg ring-1 ring-slate-200 p-3 text-left">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Services</p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="text-slate-800 truncate">{service}</span>
              <span className="text-slate-600 font-mono whitespace-nowrap">
                {basePrice !== null ? `$${basePrice.toFixed(2)}` : '—'}
              </span>
            </li>
            {extras.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="text-slate-800 truncate">{e.name}</span>
                <span className="text-slate-600 font-mono whitespace-nowrap">
                  +${e.price.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          {total !== null && (
            <div className="border-t border-slate-100 mt-2 pt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Total</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                ${total.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
