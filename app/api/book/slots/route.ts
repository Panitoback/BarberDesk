import { NextResponse } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateTenantConfig } from '@/lib/tenant-config'
import { getSlotsForDate } from '@/lib/slots'

export async function GET(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) {
    return NextResponse.json({ error: 'No subdomain' }, { status: 400 })
  }

  const url = new URL(request.url)
  const date = url.searchParams.get('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) {
    return NextResponse.json({ taken: [] satisfies string[], slots: [] satisfies string[] })
  }

  const cfgResult = validateTenantConfig(tenant.config ?? {})
  const slots = getSlotsForDate(cfgResult.ok ? cfgResult.config : null, date)

  const { data: appts } = await supabase
    .from('appointments')
    .select('time')
    .eq('tenant_id', tenant.id)
    .eq('date', date)
    .in('status', ['pending', 'completed'])

  const taken = (appts ?? []).map(a => a.time.slice(0, 5))

  return NextResponse.json({ taken, slots })
}
