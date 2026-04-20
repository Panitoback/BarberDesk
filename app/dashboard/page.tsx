import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, Calendar, Scissors, DollarSign } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import CitasHoyTable from '@/components/dashboard/CitasHoyTable'

export default async function DashboardPage() {
  const headersList = await headers()
  let subdomain = headersList.get('x-subdomain')

  if (!subdomain && process.env.NODE_ENV === 'development') {
    subdomain = 'test'
  }

  if (!subdomain) redirect('/')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nombre')
    .eq('subdominio', subdomain)
    .single()

  if (!tenant) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = `${today.slice(0, 7)}-01`

  const [
    { count: totalClientes },
    { count: citasHoyCount },
    { data: citasHoy },
    { count: visitasMes },
    { data: ingresosData },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('citas').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('fecha', today),
    supabase.from('citas').select('id, hora, servicio, estado, clients(nombre, telefono)').eq('tenant_id', tenant.id).eq('fecha', today).order('hora'),
    supabase.from('visits').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('fecha', firstOfMonth),
    supabase.from('visits').select('precio').eq('tenant_id', tenant.id).gte('fecha', firstOfMonth),
  ])

  const ingresosMes = ingresosData?.reduce((sum, v) => sum + (v.precio ?? 0), 0) ?? 0

  const fechaHoy = new Date().toLocaleDateString('es-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Bienvenido, {tenant.nombre}
        </h1>
        <p className="text-sm text-zinc-400 mt-1 capitalize">{fechaHoy}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          label="Clientes registrados"
          value={totalClientes ?? 0}
          icon={Users}
        />
        <StatsCard
          label="Citas hoy"
          value={citasHoyCount ?? 0}
          icon={Calendar}
          description="Pendientes + completadas"
        />
        <StatsCard
          label="Visitas este mes"
          value={visitasMes ?? 0}
          icon={Scissors}
        />
        <StatsCard
          label="Ingresos este mes"
          value={`$${ingresosMes.toFixed(2)}`}
          icon={DollarSign}
          description="USD"
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Citas de hoy</h2>
        <CitasHoyTable citas={(citasHoy ?? []) as Parameters<typeof CitasHoyTable>[0]['citas']} />
      </div>
    </div>
  )
}
