import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { todayInToronto } from '@/lib/dates'
import { validateTenantConfig } from '@/lib/tenant-config'
import WeeklyAgenda from '@/components/dashboard/WeeklyAgenda'
import BlockTimeButton from '@/components/dashboard/BlockTimeButton'
import GoogleCalendarSection from '@/components/dashboard/GoogleCalendarSection'
import WeekNav from '@/components/dashboard/WeekNav'

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateISO: string, n: number): string {
  const d = new Date(dateISO + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string }>
}) {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const { week, view } = await searchParams
  const anchor = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : todayInToronto()
  const monday = getMondayOfWeek(anchor)
  const sunday = addDays(monday, 6)
  const today  = todayInToronto()

  const supabase = await createClient()
  const [
    { data: appointments },
    { data: weekBlocks },
    { data: upcomingBlocks },
    { data: tenantRow },
    { data: barbers },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, date, time, service, status, price, deposit_paid, client_note, haircut_photo_url, barber_id, clients(name)')
      .eq('tenant_id', tenant.id)
      .gte('date', monday)
      .lte('date', sunday)
      .order('time'),
    supabase
      .from('time_blocks')
      .select('date, start_time, end_time, all_day, reason')
      .eq('tenant_id', tenant.id)
      .gte('date', monday)
      .lte('date', sunday),
    supabase
      .from('time_blocks')
      .select('id, date, start_time, end_time, all_day, reason, barber_id')
      .eq('tenant_id', tenant.id)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(10),
    supabase.from('tenants').select('multi_barber, config').eq('id', tenant.id).single(),
    supabase.from('barbers').select('id, name, display_order').eq('tenant_id', tenant.id).eq('active', true).order('display_order'),
  ])

  const multiBarber        = tenantRow?.multi_barber ?? false
  const barberList         = multiBarber ? (barbers ?? []) : []
  const cfgResult          = validateTenantConfig(tenantRow?.config ?? {})
  const services           = cfgResult.ok ? (cfgResult.config.services           ?? []) : []
  const fullPaymentActive  = cfgResult.ok ? (cfgResult.config.full_payment_active ?? false) : false
  const depositAmountCad   = cfgResult.ok ? (cfgResult.config.deposit_amount_cad  ?? 0)     : 0
  const hasGoogleCalendar  = cfgResult.ok ? !!cfgResult.config.google_calendar_refresh_token : false

  const activeView = view === 'calendar' ? 'calendar' : 'appointments'

  const days = Array.from({ length: 7 }, (_, i) => {
    const dateISO = addDays(monday, i)
    return {
      dateISO,
      label:   dateISO,
      isToday: dateISO === today,
      appointments: (appointments ?? [])
        .filter(a => a.date === dateISO)
        .map(a => ({
          id:                a.id,
          time:              a.time,
          service:           a.service,
          status:            a.status,
          price:             a.price ?? null,
          deposit_paid:      a.deposit_paid ?? null,
          client_note:       a.client_note,
          haircut_photo_url: a.haircut_photo_url ?? null,
          barber_id:         a.barber_id,
          clients:           Array.isArray(a.clients) ? (a.clients[0] ?? null) : a.clients,
        })),
      blocks: (weekBlocks ?? [])
        .filter(b => b.date === dateISO)
        .map(b => ({
          start_time: b.start_time,
          end_time:   b.end_time,
          all_day:    b.all_day,
          reason:     b.reason,
        })),
    }
  })

  const weekParam = week ? `week=${week}` : ''

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header: title + week navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
        <WeekNav monday={monday} view={activeView} />
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <Link
            href={weekParam ? `?${weekParam}&view=appointments` : '?view=appointments'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeView === 'appointments'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Appointments</span>
          </Link>
          <Link
            href={weekParam ? `?${weekParam}&view=calendar` : '?view=calendar'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeView === 'calendar'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>My Google Calendar</span>
          </Link>
        </div>

        {activeView === 'appointments' && (
          <BlockTimeButton upcomingBlocks={upcomingBlocks ?? []} barbers={barberList} />
        )}
      </div>

      {activeView === 'appointments' ? (
        <WeeklyAgenda
          days={days}
          monday={monday}
          barbers={barberList}
          services={services}
          depositAmountCad={depositAmountCad}
          fullPaymentActive={fullPaymentActive}
        />
      ) : hasGoogleCalendar ? (
        <GoogleCalendarSection monday={monday} fullView />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center gap-4 py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <CalendarDays className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">Connect your Google Calendar</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              See your personal events alongside your bookings — never double-book again.
            </p>
          </div>
          <a
            href="/api/calendar/auth"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Connect Google Calendar
          </a>
          <p className="text-xs text-slate-400">
            You can also connect from{' '}
            <Link href="/settings?tab=general" className="underline hover:text-slate-600">Settings → General</Link>
          </p>
        </div>
      )}
    </div>
  )
}
