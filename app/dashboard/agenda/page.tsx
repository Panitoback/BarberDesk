import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { todayInToronto } from '@/lib/dates'
import WeeklyAgenda from '@/components/dashboard/WeeklyAgenda'

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

  const supabase = await createClient()
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, date, time, service, status, clients(name)')
    .eq('tenant_id', tenant.id)
    .gte('date', monday)
    .lte('date', sunday)
    .order('time')

  const today = todayInToronto()

  const days = Array.from({ length: 7 }, (_, i) => {
    const dateISO = addDays(monday, i)
    return {
      dateISO,
      label:    dateISO,
      isToday:  dateISO === today,
      appointments: (appointments ?? [])
        .filter(a => a.date === dateISO)
        .map(a => ({
          id:      a.id,
          time:    a.time,
          service: a.service,
          status:  a.status,
          clients: Array.isArray(a.clients) ? (a.clients[0] ?? null) : a.clients,
        })),
    }
  })

  return (
    <div className="max-w-6xl mx-auto">
      <WeeklyAgenda days={days} monday={monday} />
    </div>
  )
}
