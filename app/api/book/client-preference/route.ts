import { NextResponse } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'

function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  return null
}

export async function GET(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ preferred_barber_id: null })

  const url = new URL(request.url)
  const rawPhone = url.searchParams.get('phone') ?? ''
  const phone = normalizePhone(rawPhone)
  if (!phone) return NextResponse.json({ preferred_barber_id: null })

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ preferred_barber_id: null })

  const { data: client } = await supabase
    .from('clients')
    .select('preferred_barber_id')
    .eq('tenant_id', tenant.id)
    .eq('phone', phone)
    .maybeSingle()

  // Only return preferred_barber_id if the barber is still active
  if (!client?.preferred_barber_id) {
    return NextResponse.json({ preferred_barber_id: null })
  }

  const { data: barber } = await supabase
    .from('barbers')
    .select('id, active')
    .eq('id', client.preferred_barber_id)
    .single()

  return NextResponse.json({
    preferred_barber_id: barber?.active ? barber.id : null,
  })
}
