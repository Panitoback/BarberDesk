import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import ClientsTable from '@/components/clients/ClientsTable'

export default async function ClientsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone, email, no_show_count, last_visit, loyalty_points(points, level)')
    .eq('tenant_id', tenant.id)
    .order('name')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-400 mt-1">{clients?.length ?? 0} registered clients</p>
      </div>
      <ClientsTable clients={(clients ?? []) as Parameters<typeof ClientsTable>[0]['clients']} />
    </div>
  )
}
