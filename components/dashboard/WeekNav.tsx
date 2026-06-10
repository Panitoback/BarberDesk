'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function shiftWeek(monday: string, delta: number): string {
  const d = new Date(monday + 'T12:00:00')
  d.setDate(d.getDate() + delta * 7)
  return d.toISOString().slice(0, 10)
}

export default function WeekNav({ monday, view }: { monday: string; view?: string }) {
  const router = useRouter()

  const weekLabel = (() => {
    const start = new Date(monday + 'T12:00:00')
    const end   = new Date(monday + 'T12:00:00')
    end.setDate(end.getDate() + 6)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-CA', opts)} – ${end.toLocaleDateString('en-CA', { ...opts, year: 'numeric' })}`
  })()

  function navigate(delta: number) {
    const params = new URLSearchParams({ week: shiftWeek(monday, delta) })
    if (view) params.set('view', view)
    router.push(`/agenda?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => navigate(-1)} type="button"
        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">{weekLabel}</span>
      <button onClick={() => navigate(1)} type="button"
        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
