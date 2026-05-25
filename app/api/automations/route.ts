import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

type AutomationsPayload = {
  noshow_active?:       boolean
  loyalty_active?:      boolean
  review_active?:       boolean
  reactivation_active?: boolean
  reactivation_days?:   number
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const update: AutomationsPayload = {}

  for (const key of ['noshow_active', 'loyalty_active', 'review_active', 'reactivation_active'] as const) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== 'boolean') {
        return NextResponse.json({ error: `${key} must be boolean` }, { status: 400 })
      }
      update[key] = b[key] as boolean
    }
  }

  if (b.reactivation_days !== undefined) {
    const n = b.reactivation_days
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 7 || n > 365) {
      return NextResponse.json({ error: 'reactivation_days must be an integer between 7 and 365' }, { status: 400 })
    }
    update.reactivation_days = n
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { error } = await supabase
    .from('automations_config')
    .update(update)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: 'Could not save automations' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
