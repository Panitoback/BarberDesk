import { NextResponse } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { barberPhotoUrl } from '@/lib/barbers'

export async function GET() {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, multi_barber')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant || !tenant.multi_barber) return NextResponse.json({ barbers: [] })

  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, photo_path, bio, price_modifier, instagram_handle')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  const result = (barbers ?? []).map(b => ({
    id:               b.id,
    name:             b.name,
    photo_url:        barberPhotoUrl(b.photo_path),
    bio:              b.bio,
    price_modifier:   b.price_modifier,
    instagram_handle: b.instagram_handle,
  }))

  return NextResponse.json({ barbers: result })
}
