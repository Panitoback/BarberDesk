import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'

export async function DELETE() {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantRow } = await supabase
    .from('tenants').select('id, config').eq('subdomain', subdomain).single()
  if (!tenantRow) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const result = validateTenantConfig(tenantRow.config ?? {})
  const config = result.ok ? result.config : {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { google_calendar_refresh_token: _, ...rest } = config
  await supabase.from('tenants').update({ config: rest }).eq('id', tenantRow.id)

  return NextResponse.json({ ok: true })
}
