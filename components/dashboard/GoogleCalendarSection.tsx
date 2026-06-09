'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
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
  fullView = false,
}: {
  monday: string
  fullView?: boolean
}) {
  const [events,  setEvents]  = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)

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

  const gridContent = (
    <>
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
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CalendarDays className="w-8 h-8 text-amber-400" />
          <p className="text-sm text-amber-700 font-medium">Google Calendar session expired</p>
          <a href="/api/calendar/auth" className="text-sm text-blue-600 underline font-medium">
            Reconnect your calendar
          </a>
        </div>
      )}

      {!loading && !expired && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map(d => {
            const dayEvents = eventsByDay[d.dateISO] ?? []
            return (
              <div key={d.dateISO} className={`min-w-[100px] flex-1 shrink-0 ${fullView ? 'min-h-[120px]' : ''}`}>
                <p className={`text-[11px] font-semibold mb-1.5 text-center ${d.isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                  {d.label}
                  {d.isToday && <span className="ml-1 w-1 h-1 rounded-full bg-blue-500 inline-block align-middle" />}
                </p>
                {fullView && d.isToday && (
                  <div className="h-0.5 bg-blue-200 rounded mb-2 mx-2" />
                )}
                <div className="space-y-1 min-h-[32px]">
                  {dayEvents.length === 0 ? (
                    <p className={`text-center ${fullView ? 'text-xs text-slate-300 pt-2' : 'text-[10px] text-slate-300 pt-1'}`}>—</p>
                  ) : (
                    dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        className={`bg-blue-50 border border-blue-100 rounded ${fullView ? 'px-2 py-1.5' : 'px-1.5 py-1'}`}
                        title={ev.summary}
                      >
                        <p className={`font-medium text-blue-800 truncate ${fullView ? 'text-xs' : 'text-[10px]'}`}>{ev.summary}</p>
                        {!ev.allDay && (
                          <p className={`text-blue-500 ${fullView ? 'text-[11px] mt-0.5' : 'text-[9px]'}`}>{fmt12(ev.start)} – {fmt12(ev.end)}</p>
                        )}
                        {ev.allDay && (
                          <p className={`text-blue-400 italic ${fullView ? 'text-[11px]' : 'text-[9px]'}`}>All day</p>
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
    </>
  )

  if (fullView) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {!loading && !expired && events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarDays className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No events this week</p>
            <p className="text-xs text-slate-400">Your Google Calendar is synced and up to date</p>
          </div>
        ) : (
          <div className="p-4">{gridContent}</div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 border border-blue-100 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50">
        <CalendarDays className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">My Google Calendar</span>
        {!loading && events.length > 0 && (
          <span className="text-xs text-blue-500">{events.length} event{events.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="bg-white p-3">{gridContent}</div>
    </div>
  )
}
