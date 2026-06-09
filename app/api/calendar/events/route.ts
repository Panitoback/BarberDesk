import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'
import { refreshAccessToken, fetchCalendarEvents } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantRow } = await supabase
    .from('tenants').select('id, config').eq('subdomain', subdomain).single()
  if (!tenantRow) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const result       = validateTenantConfig(tenantRow.config ?? {})
  const config       = result.ok ? result.config : {}
  const refreshToken = config.google_calendar_refresh_token
  if (!refreshToken) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') // YYYY-MM-DD
  const end   = searchParams.get('end')   // YYYY-MM-DD
  if (!start || !end) return NextResponse.json({ error: 'start and end required' }, { status: 400 })

  const accessToken = await refreshAccessToken(refreshToken)
  if (!accessToken) {
    // Refresh token expired or revoked — signal disconnect
    return NextResponse.json({ error: 'token_expired', events: [] }, { status: 401 })
  }

  const startISO = new Date(start + 'T00:00:00-05:00').toISOString()
  const endISO   = new Date(end   + 'T23:59:59-05:00').toISOString()
  const events   = await fetchCalendarEvents(accessToken, startISO, endISO)

  return NextResponse.json({ events })
}
