import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSubdomain } from '@/lib/subdomain'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED   = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

const UPLOAD_LIMIT = 12
const UPLOAD_WINDOW_MS = 60 * 60_000 // 12 uploads / hour / IP

// Sniff the real image type from magic bytes — the client-supplied MIME header
// is trivially forged, so we never trust file.type alone for a public,
// unauthenticated upload into a public bucket.
function sniffImageType(b: Uint8Array): string | null {
  if (b.length < 12) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  // RIFF....WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  // ....ftyp<brand> — HEIC family
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11])
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic'
  }
  return null
}

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const ip = getClientIp(request)
  if (!rateLimit(`photo:${ip}`, UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 })
  }

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
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 })

  // Verify real content, not the (forgeable) declared MIME type.
  const bytes      = new Uint8Array(await file.arrayBuffer())
  const sniffedType = sniffImageType(bytes)
  if (!sniffedType || !ALLOWED.includes(sniffedType)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP or HEIC images allowed' }, { status: 400 })
  }

  const ext  = sniffedType.split('/')[1]
  const path = `${tenant.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('haircut-references')
    .upload(path, bytes, { contentType: sniffedType, upsert: false })

  if (uploadError) {
    console.error('haircut photo upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('haircut-references').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
