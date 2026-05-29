import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const { id } = await params

  let body: { barber_id?: unknown }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const barberId = body.barber_id === null ? null
    : typeof body.barber_id === 'string' ? body.barber_id
    : undefined

  if (barberId === undefined) {
    return NextResponse.json({ error: 'barber_id must be a uuid or null' }, { status: 400 })
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

  if (barberId !== null) {
    const { data: barber } = await supabase
      .from('barbers')
      .select('id')
      .eq('id', barberId)
      .eq('tenant_id', tenant.id)
      .single()
    if (!barber) return NextResponse.json({ error: 'Barber not found.' }, { status: 404 })
  }

  const { error } = await supabase
    .from('appointments')
    .update({ barber_id: barberId })
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'That barber already has a booking at this time.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
