import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateSlug } from '@/lib/slug'
import { SUPABASE_COOKIE_OPTIONS } from '@/lib/subdomain'

// On a subdomain the dashboard lives at the root path — the proxy rewrites
// `/` → `/dashboard`, `/clients` → `/dashboard/clients`, etc.
function tenantUrl(slug: string, path = '/') {
  if (process.env.NODE_ENV === 'development') {
    return `http://${slug}.localhost:3000${path}`
  }
  return `https://${slug}.barberpro.ca${path}`
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Registration params — present only on new shop signup
  const shopName = searchParams.get('shop')
  const slug     = searchParams.get('slug')?.toLowerCase().trim() ?? null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // ─────────────────────────────────────────────────────────────────
  // Password recovery — let the user choose a new password.
  // Stays on the base domain; the session cookie is already set.
  // ─────────────────────────────────────────────────────────────────
  if (next === '/reset-password') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  // ─────────────────────────────────────────────────────────────────
  // New shop registration
  // ─────────────────────────────────────────────────────────────────
  if (shopName && slug) {
    // Re-validate — query strings can be tampered with
    if (validateSlug(slug)) {
      return NextResponse.redirect(`${origin}/register?error=slug-invalid`)
    }

    // Idempotent: only create if the user has no tenant yet
    const { data: existing } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!existing) {
      const { error: insertError } = await supabase.from('tenants').insert({
        owner_id:  user.id,
        name:      shopName,
        subdomain: slug,
      })

      // Subdomain taken between check and confirmation
      if (insertError) {
        return NextResponse.redirect(`${origin}/register?error=slug-taken`)
      }
    }

    const tenantSlug = existing?.subdomain ?? slug
    return NextResponse.redirect(tenantUrl(tenantSlug))
  }

  // ─────────────────────────────────────────────────────────────────
  // Normal login — find the user's tenant and redirect to its subdomain
  // ─────────────────────────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('subdomain')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (tenant?.subdomain) {
    return NextResponse.redirect(tenantUrl(tenant.subdomain, next))
  }

  // Authenticated but no tenant — push them to register
  return NextResponse.redirect(`${origin}/register`)
}
