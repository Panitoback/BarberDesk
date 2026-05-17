import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { Users, Calendar, Scissors, DollarSign } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import AppointmentsTodayTable from '@/components/dashboard/AppointmentsTodayTable'

export default async function DashboardPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = `${today.slice(0, 7)}-01`

  const [
    { count: totalClients },
    { count: todayCount },
    { data: todayAppointments },
    { count: monthlyVisits },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('date', today),
    supabase.from('appointments').select('id, time, service, status, clients(name, phone)').eq('tenant_id', tenant.id).eq('date', today).order('time'),
    supabase.from('visits').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('date', firstOfMonth),
    supabase.from('visits').select('price').eq('tenant_id', tenant.id).gte('date', firstOfMonth),
  ])

  const monthlyRevenue = revenueData?.reduce((sum, v) => sum + (v.price ?? 0), 0) ?? 0

  const todayLabel = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Welcome, {tenant.name}</h1>
        <p className="text-sm text-zinc-400 mt-1 capitalize">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="Registered clients"  value={totalClients ?? 0}                    icon={Users} />
        <StatsCard label="Appointments today"  value={todayCount ?? 0}                      icon={Calendar} description="Pending + completed" />
        <StatsCard label="Visits this month"   value={monthlyVisits ?? 0}                   icon={Scissors} />
        <StatsCard label="Revenue this month"  value={`$${monthlyRevenue.toFixed(2)}`}      icon={DollarSign} description="USD" />
      </div>

      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Today's appointments</h2>
        <AppointmentsTodayTable appointments={(todayAppointments ?? []) as Parameters<typeof AppointmentsTodayTable>[0]['appointments']} />
      </div>
    </div>
  )
}
