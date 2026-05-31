import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { GALLERY_MIN } from '@/lib/gallery'

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

  // Enforce min 2 photos — check count before allowing delete
  const { count } = await supabase
    .from('shop_gallery')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)

  // count <= GALLERY_MIN means we are AT or BELOW minimum — block deletion
  if ((count ?? 0) <= GALLERY_MIN) {
    return NextResponse.json(
      { error: `You must keep at least ${GALLERY_MIN} photos.` },
      { status: 400 },
    )
  }

  // Fetch photo to get storage path
  const { data: photo } = await supabase
    .from('shop_gallery')
    .select('id, photo_path')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

  // Delete from storage
  await supabase.storage.from('shop-gallery').remove([photo.photo_path])

  // Delete from DB
  const { error: deleteErr } = await supabase
    .from('shop_gallery')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
