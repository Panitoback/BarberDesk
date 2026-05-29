import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { todayInToronto } from '@/lib/dates'
import WeeklyAgenda from '@/components/dashboard/WeeklyAgenda'
import BlockTimeButton from '@/components/dashboard/BlockTimeButton'

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
  searchParams: Promise<{ week?: string }>
}) {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const { week } = await searchParams
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
      .select('id, date, time, service, status, client_note, barber_id, clients(name)')
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
    supabase.from('tenants').select('multi_barber').eq('id', tenant.id).single(),
    supabase.from('barbers').select('id, name, display_order').eq('tenant_id', tenant.id).eq('active', true).order('display_order'),
  ])

  const multiBarber = tenantRow?.multi_barber ?? false
  const barberList  = multiBarber ? (barbers ?? []) : []

  const days = Array.from({ length: 7 }, (_, i) => {
    const dateISO = addDays(monday, i)
    return {
      dateISO,
      label:   dateISO,
      isToday: dateISO === today,
      appointments: (appointments ?? [])
        .filter(a => a.date === dateISO)
        .map(a => ({
          id:          a.id,
          time:        a.time,
          service:     a.service,
          status:      a.status,
          client_note: a.client_note,
          barber_id:   a.barber_id,
          clients:     Array.isArray(a.clients) ? (a.clients[0] ?? null) : a.clients,
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-end mb-3">
        <BlockTimeButton upcomingBlocks={upcomingBlocks ?? []} barbers={barberList} />
      </div>
      <WeeklyAgenda days={days} monday={monday} barbers={barberList} />
    </div>
  )
}
