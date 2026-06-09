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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, tenantId } = ctx

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  type RewardUpdate = { name?: string; description?: string | null; stars_required?: number; active?: boolean }
  const b = body as Record<string, unknown>
  const update: RewardUpdate = {}

  if (b.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim() : ''
    if (!name || name.length > 100) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    update.name = name
  }
  if (b.description !== undefined) {
    const desc = typeof b.description === 'string' ? b.description.trim() || null : null
    if (desc && desc.length > 200) return NextResponse.json({ error: 'Description too long' }, { status: 400 })
    update.description = desc
  }
  if (b.stars_required !== undefined) {
    const n = typeof b.stars_required === 'number' ? Math.round(b.stars_required) : 0
    if (n < 1) return NextResponse.json({ error: 'stars_required >= 1' }, { status: 400 })
    update.stars_required = n
  }
  if (typeof b.active === 'boolean') update.active = b.active

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await supabase
    .from('loyalty_rewards')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, tenantId } = ctx

  const { error } = await supabase
    .from('loyalty_rewards')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
