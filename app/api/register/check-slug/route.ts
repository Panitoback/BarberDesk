import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'
import { validateSlug } from '@/lib/slug'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')?.toLowerCase().trim()

  if (!slug) {
    return NextResponse.json({ available: false, error: 'slug required' }, { status: 400 })
  }

  const validationError = validateSlug(slug)
  if (validationError) {
    return NextResponse.json({ available: false, error: validationError })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { available: false, error: 'misconfigured' },
      { status: 500 }
    )
  }

  // Service-role client: bypasses RLS so unauthenticated visitors
  // can actually see existing tenants during registration.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', slug)
    .maybeSingle()

  return NextResponse.json({ available: !data })
}
