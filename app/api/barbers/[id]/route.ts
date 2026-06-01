import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { todayInToronto } from '@/lib/dates'
import type { Database } from '@/lib/supabase/types'

type BarberUpdate = Database['public']['Tables']['barbers']['Update']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const updates: BarberUpdate = {}

  if ('name' in b) {
    const name = typeof b.name === 'string' ? b.name.trim() : ''
    if (name.length < 1 || name.length > 80) {
      return NextResponse.json({ error: 'Name must be 1-80 characters.' }, { status: 400 })
    }
    updates.name = name
  }

  if ('email' in b) {
    const email = typeof b.email === 'string' && b.email.trim().length > 0
      ? b.email.trim().toLowerCase()
      : null
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }
    updates.email = email
  }

  if ('bio' in b) {
    const bio = typeof b.bio === 'string' && b.bio.trim().length > 0
      ? b.bio.trim().slice(0, 200)
      : null
    updates.bio = bio
  }

  if ('active' in b) {
    updates.active = b.active === true
  }

  if ('price_modifier' in b) {
    const mod = typeof b.price_modifier === 'number' ? b.price_modifier : 1.0
    if (mod <= 0 || mod > 5) {
      return NextResponse.json({ error: 'Price modifier must be between 0 and 5.' }, { status: 400 })
    }
    updates.price_modifier = mod
  }

  if ('hours' in b) {
    updates.hours = (b.hours ?? null) as import('@/lib/supabase/types').Json | null | undefined
  }

  if ('instagram_handle' in b) {
    const handle = typeof b.instagram_handle === 'string' && b.instagram_handle.trim().length > 0
      ? b.instagram_handle.trim().replace(/^@/, '').slice(0, 50)
      : null
    updates.instagram_handle = handle
  }

  if ('display_order' in b) {
    updates.display_order = typeof b.display_order === 'number' ? b.display_order : 0
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
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

  const { data: barber, error } = await supabase
    .from('barbers')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!barber) return NextResponse.json({ error: 'Barber not found.' }, { status: 404 })

  return NextResponse.json({ barber })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Refuse delete if barber has future appointments — suggest deactivating instead
  const today = todayInToronto()
  const { count } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('barber_id', id)
    .eq('tenant_id', tenant.id)
    .gte('date', today)
    .in('status', ['pending'])

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `This barber has ${count} upcoming appointment(s). Cancel them first, or deactivate the barber instead.` },
      { status: 409 },
    )
  }

  const { error } = await supabase
    .from('barbers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
