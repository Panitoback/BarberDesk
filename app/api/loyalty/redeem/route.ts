import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const b        = body as Record<string, unknown>
  const clientId = typeof b.client_id === 'string' ? b.client_id : null
  const rewardId = typeof b.reward_id === 'string' ? b.reward_id : null
  const notes    = typeof b.notes === 'string'     ? b.notes.trim() || undefined : undefined

  if (!clientId || !rewardId) {
    return NextResponse.json({ error: 'client_id and reward_id are required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('redeem_loyalty_reward', {
    p_tenant_id: tenant.id,
    p_client_id: clientId,
    p_reward_id: rewardId,
    p_notes:     notes,
  })

  if (error) {
    if (error.message?.includes('insufficient_stars'))  return NextResponse.json({ error: 'Not enough stars' },             { status: 400 })
    if (error.message?.includes('reward_not_found'))    return NextResponse.json({ error: 'Reward not found or inactive' }, { status: 404 })
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 })
  }

  return NextResponse.json(data)
}
