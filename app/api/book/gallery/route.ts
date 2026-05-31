import { NextResponse } from 'next/server'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { galleryPhotoUrl } from '@/lib/gallery'

export async function GET() {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ photos: [] })

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return NextResponse.json({ photos: [] })

  const { data: photos } = await supabase
    .from('shop_gallery')
    .select('id, photo_path, caption, display_order')
    .eq('tenant_id', tenant.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  const result = (photos ?? []).map(p => ({
    id:            p.id,
    photo_path:    p.photo_path,
    caption:       p.caption,
    display_order: p.display_order,
    photo_url:     galleryPhotoUrl(p.photo_path),
  }))

  return NextResponse.json({ photos: result })
}
