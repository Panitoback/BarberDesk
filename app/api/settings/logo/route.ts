import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, config')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('logo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No logo provided.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Logo must be JPEG, PNG or WebP.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Logo must be under 2 MB.' }, { status: 400 })
  }

  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const storagePath = `${tenant.id}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from('tenant-logos')
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  // Persist logo_path in tenants.config
  const currentConfig = (typeof tenant.config === 'object' && tenant.config !== null)
    ? tenant.config as Record<string, unknown>
    : {}

  const { error: updateErr } = await supabase
    .from('tenants')
    .update({ config: { ...currentConfig, logo_path: storagePath } })
    .eq('id', tenant.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ logo_path: storagePath })
}

export async function DELETE(request: Request) {
  void request
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, config')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const currentConfig = (typeof tenant.config === 'object' && tenant.config !== null)
    ? tenant.config as Record<string, unknown>
    : {}

  const logoPath = typeof currentConfig.logo_path === 'string' ? currentConfig.logo_path : null
  if (logoPath) {
    await supabase.storage.from('tenant-logos').remove([logoPath])
  }

  const { logo_path: _removed, ...configWithoutLogo } = currentConfig
  await supabase.from('tenants').update({ config: configWithoutLogo as import('@/lib/supabase/types').Json }).eq('id', tenant.id)

  return NextResponse.json({ ok: true })
}
