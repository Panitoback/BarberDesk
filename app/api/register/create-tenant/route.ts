import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSlug } from '@/lib/slug'

export async function POST(request: Request) {
  let body: { shop?: unknown; slug?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const shop = typeof body.shop === 'string' ? body.shop.trim() : ''
  const slug = typeof body.slug === 'string' ? body.slug.toLowerCase().trim() : ''

  if (!shop || !slug) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  if (validateSlug(slug)) {
    return NextResponse.json({ error: 'slug_invalid' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // Idempotent: if the user already has a tenant, return it
  const { data: existing } = await supabase
    .from('tenants')
    .select('subdomain')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ subdomain: existing.subdomain })
  }

  const { error: insertError } = await supabase.from('tenants').insert({
    owner_id:  user.id,
    name:      shop,
    subdomain: slug,
  })

  if (insertError) {
    // Unique violation on subdomain → someone else grabbed it between check-slug and now
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'slug_taken' }, { status: 409 })
    }
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ subdomain: slug })
}
