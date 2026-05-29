import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayInToronto, addDaysISO } from '@/lib/dates'
import { barberColor } from '@/lib/barbers'
import { Scissors } from 'lucide-react'

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

export default async function StaffPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, multi_barber')
    .eq('staff_token', token)
    .single()

  if (!tenant) notFound()

  const today      = todayInToronto()
  const weekOutISO = addDaysISO(today, 7)

  const todayLabel = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const [
    { data: todayAppts },
    { data: upcomingAppts },
    { data: barbers },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, time, service, status, client_note, barber_id, clients(name)')
      .eq('tenant_id', tenant.id)
      .eq('date', today)
      .order('time'),
    supabase
      .from('appointments')
      .select('id, date, time, service, barber_id, clients(name)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .gt('date', today)
      .lte('date', weekOutISO)
      .order('date')
      .order('time')
      .limit(30),
    supabase
      .from('barbers')
      .select('id, name, display_order')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('display_order'),
  ])

  const barberMap = new Map((barbers ?? []).map((b, i) => [b.id, { name: b.name, color: barberColor(i) }]))
  const showBarbers = tenant.multi_barber && (barbers ?? []).length > 0

  // Group upcoming by date
  const upcomingByDate = new Map<string, typeof upcomingAppts>()
  for (const a of upcomingAppts ?? []) {
    const list = upcomingByDate.get(a.date) ?? []
    list.push(a)
    upcomingByDate.set(a.date, list)
  }

  function formatDate(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', {
      timeZone: 'America/Toronto',
      weekday: 'short', month: 'short', day: 'numeric',
    })
  }

  function formatTime(t: string) {
    const [hStr, m] = t.slice(0, 5).split(':')
    const h = parseInt(hStr, 10)
    return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 leading-tight">{tenant.name}</h1>
            <p className="text-xs text-slate-400">Staff view · read only</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Today */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Today&apos;s appointments</h2>
            <span className="text-xs text-slate-400 capitalize">{todayLabel}</span>
          </div>

          {(todayAppts ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-sm text-slate-400">
              No appointments today.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
              {(todayAppts ?? []).map(a => {
                const client = Array.isArray(a.clients) ? a.clients[0] : a.clients
                const barber = a.barber_id ? barberMap.get(a.barber_id) : null
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm font-mono text-slate-500 w-16 shrink-0">
                      {formatTime(a.time)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {client?.name ?? 'Walk-in'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{a.service}</p>
                      {a.client_note && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 truncate">
                          {a.client_note}
                        </p>
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
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-600">{formatDate(date)}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {(appts ?? []).map(a => {
                      const client = Array.isArray(a.clients) ? a.clients[0] : a.clients
                      const barber = a.barber_id ? barberMap.get(a.barber_id) : null
                      return (
                        <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="text-sm font-mono text-slate-500 w-16 shrink-0">
                            {formatTime(a.time)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {client?.name ?? 'Walk-in'}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{a.service}</p>
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

      </div>
    </div>
  )
}
