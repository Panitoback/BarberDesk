import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { galleryPhotoUrl, GALLERY_MAX } from '@/lib/gallery'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 3 * 1024 * 1024 // 3 MB

export async function GET() {
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

  // Enforce max 10 photos
  const { count } = await supabase
    .from('shop_gallery')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)

  if ((count ?? 0) >= GALLERY_MAX) {
    return NextResponse.json(
      { error: `Maximum ${GALLERY_MAX} photos allowed.` },
      { status: 400 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('photo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No photo provided.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Photo must be JPEG, PNG or WebP.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Photo must be under 3 MB.' }, { status: 400 })
  }

  const caption = (formData.get('caption') as string | null)?.trim() || null

  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const photoId = randomUUID()
  const storagePath = `${tenant.id}/${photoId}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from('shop-gallery')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  // Get current max display_order
  const { data: maxRow } = await supabase
    .from('shop_gallery')
    .select('display_order')
    .eq('tenant_id', tenant.id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxRow?.display_order ?? -1) + 1

  const { data: inserted, error: insertErr } = await supabase
    .from('shop_gallery')
    .insert({ tenant_id: tenant.id, photo_path: storagePath, caption, display_order: nextOrder })
    .select('id, photo_path, caption, display_order')
    .single()

  if (insertErr) {
    // Rollback storage upload
    await supabase.storage.from('shop-gallery').remove([storagePath])
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    photo: {
      id:            inserted.id,
      photo_path:    inserted.photo_path,
      caption:       inserted.caption,
      display_order: inserted.display_order,
      photo_url:     galleryPhotoUrl(inserted.photo_path),
    },
  })
}
