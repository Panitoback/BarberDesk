import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'
import { after } from 'next/server'

function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sortedKeys = Object.keys(params).sort()
  const str = url + sortedKeys.map(k => k + params[k]).join('')
  const expected = createHmac('sha1', authToken).update(str).digest('base64')
  return expected === signature
}

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const text   = await request.text()
  const params = Object.fromEntries(new URLSearchParams(text))

  if (authToken) {
    const signature = request.headers.get('x-twilio-signature') ?? ''
    const url = `${appUrl}/api/webhooks/twilio`
    if (!verifyTwilioSignature(authToken, url, params, signature)) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const to  = params['To']         ?? ''
  const from = params['From']      ?? ''
  const body = params['Body']      ?? ''
  const sid  = params['MessageSid'] ?? ''

  // Defensive: empty `To` would match a tenant whose twilio_number is NULL
  // (the most common misconfiguration), routing every misdirected SMS to it.
  // Drop the request early so unrouted SMS surface only via the warning below.
  if (!to) {
    console.warn('[twilio webhook] inbound with empty To param', { from, sid })
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
  }

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, subdomain, config')
    .eq('twilio_number', to)
    .single()

  if (!tenant) {
    // Visibility for unrouted SMS — surfaces in Vercel function logs. Usually
    // means the receiving number is not yet linked to any tenant
    // (`tenants.twilio_number` not set).
    console.warn('[twilio webhook] no tenant matches incoming number', { to, from, sid })
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('phone', from)
    .maybeSingle()

  await supabase.from('messages').insert({
    tenant_id:  tenant.id,
    client_id:  client?.id ?? null,
    direction:  'inbound',
    body,
    status:     'delivered',
    twilio_sid: sid,
  })

  // `after()` keeps the runtime alive until the callback completes — without it,
  // Vercel kills the fire-and-forget fetch before the request reaches n8n, causing
  // intermittent auto-reply failures (especially after a cold start).
  const autoReplyUrl = process.env.N8N_AUTOREPLY_WEBHOOK_URL
  if (autoReplyUrl) {
    after(async () => {
      try {
        await fetch(autoReplyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id:   tenant.id,
            subdomain:   tenant.subdomain,
            shop_name:   tenant.name,
            shop_data:   tenant.config ?? {},
            from_number: from,
            client_name: client?.name ?? 'there',
            message:     body,
          }),
        })
      } catch {
        // n8n unreachable — inbound is already persisted in `messages` so the owner can read it manually
      }
    })
  }

  return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
}
