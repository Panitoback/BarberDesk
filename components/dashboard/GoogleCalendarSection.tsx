'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { todayInToronto } from '@/lib/dates'
import type { CalendarEvent } from '@/lib/google-calendar'

type DayCol = { dateISO: string; label: string; isToday: boolean }

const DAY_LABELS: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat',
}

function shortLabel(dateISO: string): string {
  const d = new Date(dateISO + 'T12:00:00')
  return `${DAY_LABELS[d.getDay()]} ${d.getDate()}`
}

function fmt12(time24: string): string {
  const [hStr, m] = time24.split(':')
  const h = parseInt(hStr, 10)
  return `${h % 12 === 0 ? 12 : h % 12}:${m}${h >= 12 ? 'pm' : 'am'}`
}

export default function GoogleCalendarSection({
  monday,
}: {
  monday: string
}) {
  const [open,    setOpen]    = useState(true)
  const [events,  setEvents]  = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)

  // Build 7-day columns from monday
  const days: DayCol[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    return { dateISO: iso, label: shortLabel(iso), isToday: iso === todayInToronto() }
  })

  const start = days[0].dateISO
  const end   = days[6].dateISO

  useEffect(() => {
    setLoading(true)
    setExpired(false)
    fetch(`/api/calendar/events?start=${start}&end=${end}`)
      .then(r => {
        if (r.status === 401) { setExpired(true); return { events: [] } }
        return r.json()
      })
      .then((d: { events?: CalendarEvent[] }) => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [start, end])

  const eventsByDay = Object.fromEntries(
    days.map(d => [d.dateISO, events.filter(e => e.date === d.dateISO)])
  )
  const hasAnyEvent = events.length > 0

  return (
    <div className="mt-4 border border-blue-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">My Google Calendar</span>
          {!loading && hasAnyEvent && (
            <span className="text-xs text-blue-500">{events.length} event{events.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-blue-500" />}
      </button>

      {open && (
        <div className="bg-white p-3">
          {loading && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map(d => (
                <div key={d.dateISO} className="min-w-[100px] flex-1">
                  <div className="h-4 bg-slate-100 rounded animate-pulse mb-2" />
                  <div className="h-8 bg-slate-50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!loading && expired && (
            <p className="text-xs text-amber-600 text-center py-2">
              Google Calendar session expired.{' '}
              <a href="/api/calendar/auth" className="underline font-medium">Reconnect</a>
            </p>
          )}

          {!loading && !expired && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map(d => {
                const dayEvents = eventsByDay[d.dateISO] ?? []
                return (
                  <div key={d.dateISO} className="min-w-[100px] flex-1 shrink-0">
                    <p className={`text-[11px] font-semibold mb-1.5 text-center ${d.isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                      {d.label}
                      {d.isToday && <span className="ml-1 w-1 h-1 rounded-full bg-blue-500 inline-block align-middle" />}
                    </p>
                    <div className="space-y-1 min-h-[32px]">
                      {dayEvents.length === 0 ? (
                        <p className="text-[10px] text-slate-300 text-center pt-1">—</p>
                      ) : (
                        dayEvents.map(ev => (
                          <div
                            key={ev.id}
                            className="bg-blue-50 border border-blue-100 rounded px-1.5 py-1"
                            title={ev.summary}
                          >
                            <p className="text-[10px] font-medium text-blue-800 truncate">{ev.summary}</p>
                            {!ev.allDay && (
                              <p className="text-[9px] text-blue-500">{fmt12(ev.start)} – {fmt12(ev.end)}</p>
                            )}
                            {ev.allDay && (
                              <p className="text-[9px] text-blue-400 italic">All day</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
