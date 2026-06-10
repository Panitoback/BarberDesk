'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Camera } from 'lucide-react'

const statusLabel: Record<string, string> = {
  pending:   'Pending',
  completed: 'Done',
  no_show:   'No show',
  cancelled: 'Cancelled',
}

const statusStyles: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  completed: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  no_show:   'bg-red-50 text-red-700 ring-1 ring-red-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

function PhotoButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        aria-label="View haircut reference photo"
        className="inline-flex items-center shrink-0 text-indigo-500"
      >
        <Camera className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-xs w-full rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={url} alt="Haircut reference" className="w-full object-contain max-h-[70vh]" />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 text-xs"
            >✕</button>
          </div>
        </div>
      )}
    </>
  )
}

type Barber = {
  id: string
  name: string
  color: { badge: string }
}

type Appointment = {
  id: string
  time: string
  service: string
  status: string
  client_note: string | null
  haircut_photo_url: string | null
  barber_id: string | null
  duration_min: number | null
  clients: { name: string } | { name: string }[] | null
}

type UpcomingAppointment = {
  id: string
  date: string
  time: string
  service: string
  barber_id: string | null
  duration_min: number | null
  clients: { name: string } | { name: string }[] | null
}

function formatTime(t: string) {
  const [hStr, m] = t.slice(0, 5).split(':')
  const h = parseInt(hStr, 10)
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function clientName(clients: Appointment['clients']) {
  const c = Array.isArray(clients) ? clients[0] : clients
  return c?.name ?? 'Walk-in'
}

function DurationBadge({ minutes }: { minutes: number | null }) {
  if (!minutes) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <Clock className="w-3 h-3" />
      {minutes}m
    </span>
  )
}

export default function StaffView({
  todayAppts,
  upcomingAppts,
  barbers,
  showBarbers,
  todayLabel,
  todayCount,
}: {
  todayAppts:    Appointment[]
  upcomingAppts: UpcomingAppointment[]
  barbers:       Barber[]
  showBarbers:   boolean
  todayLabel:    string
  todayCount:    number
}) {
  const router = useRouter()
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      router.refresh()
      setLastRefreshed(new Date())
    }, 2 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [router])

  const barberMap = new Map(barbers.map(b => [b.id, b]))

  function filterAppts<T extends { barber_id: string | null }>(list: T[]): T[] {
    if (!showBarbers || !selectedBarber) return list
    return list.filter(a => a.barber_id === selectedBarber)
  }

  const filteredToday    = filterAppts(todayAppts)
  const filteredUpcoming = filterAppts(upcomingAppts)

  const upcomingByDate = new Map<string, UpcomingAppointment[]>()
  for (const a of filteredUpcoming) {
    const list = upcomingByDate.get(a.date) ?? []
    list.push(a)
    upcomingByDate.set(a.date, list)
  }

  const refreshLabel = lastRefreshed.toLocaleTimeString('en-CA', {
    timeZone: 'America/Toronto',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Barber filter pills */}
      {showBarbers && barbers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBarber(null)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              !selectedBarber
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
            }`}
          >
            All barbers
          </button>
          {barbers.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBarber(prev => prev === b.id ? null : b.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                selectedBarber === b.id
                  ? `${b.color.badge} border-transparent`
                  : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Today */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Today&apos;s appointments</h2>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {selectedBarber ? filteredToday.length : todayCount}
            </span>
          </div>
          <span className="text-xs text-slate-400 capitalize">{todayLabel}</span>
        </div>

        {filteredToday.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-sm text-slate-400">
            No appointments today.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {filteredToday.map(a => {
              const barber = a.barber_id ? barberMap.get(a.barber_id) : null
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-mono text-slate-500 w-16 shrink-0">
                    {formatTime(a.time)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {clientName(a.clients)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400 truncate">{a.service}</p>
                      <DurationBadge minutes={a.duration_min} />
                    </div>
                    {(a.client_note || a.haircut_photo_url) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {a.client_note && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 truncate flex-1 min-w-0">
                            {a.client_note}
                          </p>
                        )}
                        {a.haircut_photo_url && (
                          <PhotoButton url={a.haircut_photo_url} />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {showBarbers && barber && (
                      <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${barber.color.badge}`}>
                        {barber.name}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[a.status] ?? statusStyles.pending}`}>
                      {statusLabel[a.status] ?? a.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcomingByDate.size > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Next 7 days</h2>
          <div className="space-y-3">
            {Array.from(upcomingByDate.entries()).map(([date, appts]) => (
              <div key={date} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">{formatDate(date)}</span>
                  <span className="text-xs text-slate-400">{appts.length} apt{appts.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {appts.map(a => {
                    const barber = a.barber_id ? barberMap.get(a.barber_id) : null
                    return (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-sm font-mono text-slate-500 w-16 shrink-0">
                          {formatTime(a.time)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {clientName(a.clients)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-400 truncate">{a.service}</p>
                            <DurationBadge minutes={a.duration_min} />
                          </div>
                        </div>
                        {showBarbers && barber && (
                          <span className={`hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${barber.color.badge}`}>
                            {barber.name}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer refresh indicator */}
      <p className="text-center text-xs text-slate-300 pb-2">
        Auto-refreshes every 2 min · last updated {refreshLabel}
      </p>

    </div>
  )
}
