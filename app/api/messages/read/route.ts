import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenant } from '@/lib/session'

export async function POST(request: Request) {
  let body: { client_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const clientId = typeof body.client_id === 'string' ? body.client_id : null
  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const supabase = await createClient()

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('tenant_id', tenant.id)
    .eq('client_id', clientId)
    .eq('direction', 'inbound')
    .is('read_at', null)

  return NextResponse.json({ ok: true })
}
