import { NextResponse } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayInToronto } from '@/lib/dates'
import { normalizePhone } from '@/lib/phone'

export async function GET(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const rawPhone = searchParams.get('phone') ?? ''
  const phone = normalizePhone(rawPhone)

  if (!phone) {
    return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })

  // Find client by phone for this tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('phone', phone)
    .eq('is_anonymous', false)
    .maybeSingle()

  if (!client) return NextResponse.json({ appointments: [] })

  const today = todayInToronto()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, date, time, service, duration_min, barber_id, barbers(name)')
    .eq('tenant_id', tenant.id)
    .eq('client_id', client.id)
    .eq('status', 'pending')
    .gte('date', today)
    .order('date')
    .order('time')
    .limit(10)

  return NextResponse.json({ appointments: appointments ?? [] })
}
