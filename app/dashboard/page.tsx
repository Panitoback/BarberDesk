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

export default async function DashboardPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()

  const today = todayInToronto()
  const firstOfMonth = `${today.slice(0, 7)}-01`
  const weekOutISO = addDaysISO(today, 7)

  const [
    { count: totalClients },
    { count: todayCount },
    { data: todayAppointments },
    { data: upcomingAppointments },
    { count: monthlyVisits },
    { data: revenueData },
    { data: tenantRow },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('date', today),
    supabase.from('appointments').select('id, time, service, price, status, clients(name, phone)').eq('tenant_id', tenant.id).eq('date', today).order('time'),
    supabase.from('appointments').select('id, date, time, service, clients(name, phone)').eq('tenant_id', tenant.id).eq('status', 'pending').gt('date', today).lte('date', weekOutISO).order('date').order('time').limit(10),
    supabase.from('visits').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('date', firstOfMonth),
    supabase.from('visits').select('price').eq('tenant_id', tenant.id).gte('date', firstOfMonth),
    supabase.from('tenants').select('config').eq('id', tenant.id).single(),
  ])

  const cfgResult = validateTenantConfig(tenantRow?.config ?? {})
  const services  = cfgResult.ok ? (cfgResult.config.services ?? []) : []

  const monthlyRevenue = revenueData?.reduce((sum, v) => sum + (v.price ?? 0), 0) ?? 0

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
        <StatsCard label="Registered clients"  value={totalClients ?? 0}                    icon={Users} />
        <StatsCard label="Appointments today"  value={todayCount ?? 0}                      icon={Calendar} description="Pending + completed" />
        <StatsCard label="Visits this month"   value={monthlyVisits ?? 0}                   icon={Scissors} />
        <StatsCard label="Revenue this month"  value={`$${monthlyRevenue.toFixed(2)}`}      icon={DollarSign} description="CAD" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Today&apos;s appointments</h2>
          <div className="flex items-center gap-2">
            <NewAppointmentButton services={services} />
            <WalkInButton services={services} />
          </div>
        </div>
        <AppointmentsTodayTable
          appointments={(todayAppointments ?? []) as Parameters<typeof AppointmentsTodayTable>[0]['appointments']}
          services={services}
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Upcoming bookings · next 7 days</h2>
        <UpcomingBookings appointments={(upcomingAppointments ?? []) as Parameters<typeof UpcomingBookings>[0]['appointments']} />
      </div>
    </div>
  )
}
