import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSubdomain } from '@/lib/subdomain'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED   = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP or HEIC images allowed' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 })

  const ext  = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const path = `${tenant.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('haircut-references')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('haircut photo upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('haircut-references').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
