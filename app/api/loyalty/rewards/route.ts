import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

async function getCtx() {
  const subdomain = await getSubdomain()
  if (!subdomain) return null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: tenant } = await supabase.from('tenants').select('id').eq('subdomain', subdomain).single()
  return tenant ? { supabase, tenantId: tenant.id } : null
}

export async function GET() {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, tenantId } = ctx

  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('id, name, description, stars_required, active, display_order')
    .eq('tenant_id', tenantId)
    .order('display_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: 'Failed to load rewards' }, { status: 500 })
  return NextResponse.json({ rewards: data })
}

export async function POST(request: Request) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, tenantId } = ctx

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const b = body as Record<string, unknown>
  const name           = typeof b.name === 'string'           ? b.name.trim()                   : ''
  const starsRequired  = typeof b.stars_required === 'number' ? Math.round(b.stars_required)    : 0
  const description    = typeof b.description === 'string'    ? b.description.trim() || null    : null

  if (!name || name.length > 100)   return NextResponse.json({ error: 'Invalid name' },          { status: 400 })
  if (starsRequired < 1)             return NextResponse.json({ error: 'stars_required >= 1' },   { status: 400 })
  if (description && description.length > 200) return NextResponse.json({ error: 'Description too long' }, { status: 400 })

  const { data, error } = await supabase
    .from('loyalty_rewards')
    .insert({ tenant_id: tenantId, name, description, stars_required: starsRequired })
    .select('id, name, description, stars_required, active, display_order')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 })
  return NextResponse.json({ reward: data }, { status: 201 })
}
