import { createAdminClient } from '@/lib/supabase/admin'
import TenantsTable from '@/components/admin/TenantsTable'

export const dynamic = 'force-dynamic'

type TenantRow = {
  id: string
  name: string
  subdomain: string
  twilio_number: string | null
  plan: 'trial' | 'active' | 'suspended'
  created_at: string
  owner_id: string
  owner_email: string
  stats: { clients: number; appointments: number; sms_sent: number }
}

async function getTenants(): Promise<TenantRow[]> {
  const supabase = createAdminClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, subdomain, twilio_number, plan, created_at, owner_id')
    .order('created_at', { ascending: false })

  if (!tenants?.length) return []

  // Auth Admin API — service-role required. Used to map owner_id → email.
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const emailById = new Map(users.map(u => [u.id, u.email ?? '']))

  // Per-tenant counts in parallel. At this scale (single-digit tenants) the
  // N+1 cost is irrelevant; revisit with a single GROUP BY query if we ever
  // have 100+ tenants.
  const stats = await Promise.all(tenants.map(async (t) => {
    const [c, a, m] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id).eq('direction', 'outbound'),
    ])
    return {
      tenantId: t.id,
      clients: c.count ?? 0,
      appointments: a.count ?? 0,
      sms_sent: m.count ?? 0,
    }
  }))

  return tenants.map(t => ({
    ...t,
    owner_email: emailById.get(t.owner_id) ?? '—',
    stats: stats.find(s => s.tenantId === t.id) ?? { clients: 0, appointments: 0, sms_sent: 0 },
  }))
}

export default async function AdminPage() {
  const tenants = await getTenants()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
        <p className="text-sm text-slate-500 mt-1">
          {tenants.length === 0 ? 'No shops registered yet.' : `${tenants.length} shop${tenants.length === 1 ? '' : 's'} registered.`}
        </p>
      </div>

      <TenantsTable tenants={tenants} />
    </div>
  )
}
