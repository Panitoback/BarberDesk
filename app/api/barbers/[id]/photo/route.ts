import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the barber belongs to this tenant (RLS handles it, but we need tenant.id for path)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: barber } = await supabase
    .from('barbers')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()
  if (!barber) return NextResponse.json({ error: 'Barber not found' }, { status: 404 })

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
    return NextResponse.json({ error: 'Photo must be under 2 MB.' }, { status: 400 })
  }

  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const storagePath = `${tenant.id}/${id}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from('barber-photos')
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { error: updateErr } = await supabase
    .from('barbers')
    .update({ photo_path: storagePath })
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ photo_path: storagePath })
}
