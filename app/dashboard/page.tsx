import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { todayInToronto, addDaysISO } from '@/lib/dates'
import { Users, Calendar, Scissors, DollarSign } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import AppointmentsTodayTable from '@/components/dashboard/AppointmentsTodayTable'
import BookingLinkCard from '@/components/dashboard/BookingLinkCard'
import UpcomingBookings from '@/components/dashboard/UpcomingBookings'
import WalkInButton from '@/components/dashboard/WalkInButton'
import NewAppointmentButton from '@/components/dashboard/NewAppointmentButton'
import { validateTenantConfig } from '@/lib/tenant-config'
import { barberColor } from '@/lib/barbers'

export default async function DashboardPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()

  const today        = todayInToronto()
  const firstOfMonth = `${today.slice(0, 7)}-01`
  const weekOutISO   = addDaysISO(today, 7)

  const [
    { count: totalClients },
    { count: todayCount },
    { data: todayAppointments },
    { data: upcomingAppointments },
    { count: monthlyVisits },
    { data: revenueData },
    { data: tenantRow },
    { data: barbers },
    { data: revenueByBarberRaw },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('is_anonymous', false),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('date', today),
    supabase.from('appointments')
      .select('id, time, service, price, status, client_note, barber_id, clients(name, phone), visits(price, extras)')
      .eq('tenant_id', tenant.id).eq('date', today).order('time'),
    supabase.from('appointments')
      .select('id, date, time, service, clients(name, phone)')
      .eq('tenant_id', tenant.id).eq('status', 'pending').gt('date', today).lte('date', weekOutISO)
      .order('date').order('time').limit(10),
    supabase.from('visits').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('date', firstOfMonth),
    supabase.from('visits').select('price').eq('tenant_id', tenant.id).gte('date', firstOfMonth),
    supabase.from('tenants').select('config, multi_barber').eq('id', tenant.id).single(),
    supabase.from('barbers').select('id, name, display_order').eq('tenant_id', tenant.id).eq('active', true).order('display_order'),
    supabase.from('visits')
      .select('price, appointments!appointment_id(barber_id)')
      .eq('tenant_id', tenant.id)
      .gte('date', firstOfMonth)
      .not('appointment_id', 'is', null),
  ])

  const cfgResult    = validateTenantConfig(tenantRow?.config ?? {})
  const services     = cfgResult.ok ? (cfgResult.config.services ?? []) : []
  const multiBarber  = tenantRow?.multi_barber ?? false
  const monthlyRevenue = revenueData?.reduce((sum, v) => sum + (v.price ?? 0), 0) ?? 0

  // Revenue per barber — aggregate visits by barber_id
  const revenueMap = new Map<string, { revenue: number; visits: number }>()
  for (const v of revenueByBarberRaw ?? []) {
    const appt = Array.isArray(v.appointments) ? v.appointments[0] : v.appointments
    const bid  = (appt as { barber_id?: string | null } | null)?.barber_id
    if (!bid) continue
    const cur = revenueMap.get(bid) ?? { revenue: 0, visits: 0 }
    revenueMap.set(bid, { revenue: cur.revenue + (v.price ?? 0), visits: cur.visits + 1 })
  }

  const revenueByBarber = (barbers ?? [])
    .map((b, i) => ({
      id:      b.id,
      name:    b.name,
      color:   barberColor(i),
      revenue: revenueMap.get(b.id)?.revenue ?? 0,
      visits:  revenueMap.get(b.id)?.visits  ?? 0,
    }))
    .filter(b => b.visits > 0)

  const todayLabel = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const h = await headers()
  const host = h.get('host') ?? `${tenant.subdomain}.barberqueue.pro`
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const bookingUrl = `${protocol}://${host}/book`

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {tenant.name}</h1>
        <p className="text-sm text-slate-400 mt-1 capitalize">{todayLabel}</p>
      </div>

      <BookingLinkCard url={bookingUrl} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="Registered clients"  value={totalClients ?? 0}               icon={Users} />
        <StatsCard label="Appointments today"  value={todayCount ?? 0}                  icon={Calendar} description="Pending + completed" />
        <StatsCard label="Visits this month"   value={monthlyVisits ?? 0}               icon={Scissors} />
        <StatsCard label="Revenue this month"  value={`$${monthlyRevenue.toFixed(2)}`}  icon={DollarSign} description="CAD" />
      </div>

      {/* Revenue by barber — only shown when multi_barber enabled and data exists */}
      {multiBarber && revenueByBarber.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Revenue by barber · this month</h2>
          <div className="divide-y divide-slate-50">
            {revenueByBarber.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2.5 gap-4">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.color.dot}`} />
                  <span className="text-sm font-medium text-slate-800">{b.name}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-slate-400">{b.visits} visit{b.visits !== 1 ? 's' : ''}</span>
                  <span className="font-mono font-semibold text-slate-900">${b.revenue.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Today&apos;s appointments</h2>
          <div className="flex items-center gap-2">
            <NewAppointmentButton services={services} barbers={multiBarber ? (barbers ?? []) : []} />
            <WalkInButton services={services} barbers={multiBarber ? (barbers ?? []) : []} />
          </div>
        </div>
        <AppointmentsTodayTable
          appointments={(todayAppointments ?? []) as Parameters<typeof AppointmentsTodayTable>[0]['appointments']}
          services={services}
          barbers={multiBarber ? (barbers ?? []) : []}
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Upcoming bookings · next 7 days</h2>
        <UpcomingBookings appointments={(upcomingAppointments ?? []) as Parameters<typeof UpcomingBookings>[0]['appointments']} />
      </div>
    </div>
  )
}
