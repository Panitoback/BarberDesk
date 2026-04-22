import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const headersList = await headers()
  const subdomain = headersList.get('x-subdomain')

  if (!subdomain) {
    return NextResponse.json({ error: 'No subdomain' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, nombre, subdominio, plan')
    .eq('subdominio', subdomain)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

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
    supabase.from('citas').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('fecha', today),
    supabase.from('citas').select('id, hora, servicio, estado, clients(nombre, telefono)').eq('tenant_id', tenant.id).eq('fecha', today).order('hora'),
    supabase.from('visits').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('fecha', firstOfMonth),
    supabase.from('visits').select('precio').eq('tenant_id', tenant.id).gte('fecha', firstOfMonth),
  ])

  const monthlyRevenue = revenueData?.reduce((sum, v) => sum + (v.precio ?? 0), 0) ?? 0

  return NextResponse.json({
    tenant,
    stats: {
      total_clients:       totalClients ?? 0,
      appointments_today:  todayCount ?? 0,
      monthly_visits:      monthlyVisits ?? 0,
      monthly_revenue:     monthlyRevenue,
    },
    appointments_today: todayAppointments ?? [],
  })
}
