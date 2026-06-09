import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOAuthState } from '@/lib/google-calendar'
import { validateTenantConfig } from '@/lib/tenant-config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Google denied access
  if (error || !code || !state) {
    return NextResponse.redirect('https://barberqueue.pro/settings?tab=general&calendar=denied')
  }

  const payload = await verifyOAuthState(state)
  if (!payload) {
    return NextResponse.redirect('https://barberqueue.pro/settings?tab=general&calendar=error')
  }

  const tenantId  = payload.tenantId  as string
  const subdomain = payload.subdomain as string
  const origin    = (payload.origin   as string | undefined) ?? `https://${subdomain}.barberqueue.pro`

  const redirectBase = `${origin}/settings?tab=general`

  // Exchange code for tokens
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'https://barberqueue.pro/api/calendar/callback'
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID     ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri:  redirectUri,
      code,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${redirectBase}&calendar=error`)
  }

  const tokens = await tokenRes.json() as { refresh_token?: string; access_token?: string }
  if (!tokens.refresh_token) {
    // No refresh_token — user already authorized before; send them back to revoke & reconnect
    return NextResponse.redirect(`${redirectBase}&calendar=no_refresh_token`)
  }

  // Save refresh_token into tenants.config
  const supabase = createAdminClient()
  const { data: tenantRow } = await supabase
    .from('tenants').select('config').eq('id', tenantId).single()

  const result     = validateTenantConfig(tenantRow?.config ?? {})
  const existing   = result.ok ? result.config : {}
  const newConfig  = { ...existing, google_calendar_refresh_token: tokens.refresh_token }

  await supabase.from('tenants').update({ config: newConfig }).eq('id', tenantId)

  return NextResponse.redirect(`${redirectBase}&calendar=connected`)
}
