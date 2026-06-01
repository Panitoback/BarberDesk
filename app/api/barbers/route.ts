import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

export async function GET() {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, multi_barber')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: barbers, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ barbers: barbers ?? [] })
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name: rawName, email: rawEmail, bio: rawBio, instagram_handle: rawIg, price_modifier: rawMod } = body as Record<string, unknown>

  const name = typeof rawName === 'string' ? rawName.trim() : ''
  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: 'Name must be 1-80 characters.' }, { status: 400 })
  }

  const email = typeof rawEmail === 'string' && rawEmail.trim().length > 0
    ? rawEmail.trim().toLowerCase()
    : null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  const bio = typeof rawBio === 'string' && rawBio.trim().length > 0
    ? rawBio.trim().slice(0, 200)
    : null

  const instagramHandle = typeof rawIg === 'string' && rawIg.trim().length > 0
    ? rawIg.trim().replace(/^@/, '').slice(0, 50)
    : null

  const priceModifier = typeof rawMod === 'number' ? rawMod : 1.0
  if (priceModifier <= 0 || priceModifier > 5) {
    return NextResponse.json({ error: 'Price modifier must be between 0 and 5.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, multi_barber')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  if (!tenant.multi_barber) {
    return NextResponse.json({ error: 'Multi-barber is not enabled for this shop.' }, { status: 403 })
  }

  const { data: barber, error } = await supabase
    .from('barbers')
    .insert({ tenant_id: tenant.id, name, email, bio, instagram_handle: instagramHandle, price_modifier: priceModifier })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ barber })
}
