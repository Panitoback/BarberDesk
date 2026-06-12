import { NextResponse } from 'next/server'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type CampaignSegment = 'all' | 'active_30' | 'inactive_60' | 'vip'

const SEGMENT_LABELS: Record<CampaignSegment, string> = {
  all:          'All clients',
  active_30:    'Active (last 30 days)',
  inactive_60:  'Inactive (60+ days)',
  vip:          'VIP clients (Gold & Platinum)',
}

const BATCH_SIZE = 100

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

function buildEmailHtml(opts: {
  shopName: string
  body:     string
  clientId: string
}): string {
  const unsubUrl = `https://barberqueue.pro/api/unsubscribe?c=${opts.clientId}`
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(opts.shopName)}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">${escapeHtml(opts.body)}</p>
        </td></tr>
        <tr><td style="padding:0 32px 32px;border-top:1px solid #f1f5f9;">
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
            © ${new Date().getFullYear()} ${escapeHtml(opts.shopName)} · Powered by BarberQueue<br/>
            <a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function getRecipients(tenantId: string, segment: CampaignSegment) {
  const admin = createAdminClient()

  if (segment === 'vip') {
    const { data: vipRows } = await admin
      .from('loyalty_points')
      .select('client_id')
      .eq('tenant_id', tenantId)
      .in('level', ['gold', 'platinum'])

    if (!vipRows?.length) return []
    const vipIds = vipRows.map(r => r.client_id)

    const { data } = await admin
      .from('clients')
      .select('id, name, email')
      .eq('tenant_id', tenantId)
      .eq('is_anonymous', false)
      .eq('email_unsubscribed', false)
      .not('email', 'is', null)
      .in('id', vipIds)

    return (data ?? []) as { id: string; name: string; email: string }[]
  }

  let query = admin
    .from('clients')
    .select('id, name, email')
    .eq('tenant_id', tenantId)
    .eq('is_anonymous', false)
    .eq('email_unsubscribed', false)
    .not('email', 'is', null)

  if (segment === 'active_30') {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    query = query.gte('last_visit', cutoff)
  } else if (segment === 'inactive_60') {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    query = query.or(`last_visit.lt.${cutoff},last_visit.is.null`)
  }

  const { data } = await query
  return (data ?? []) as { id: string; name: string; email: string }[]
}

// GET /api/campaigns — list history or preview count
export async function GET(request: Request) {
  const tenant = await getTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const preview = searchParams.get('preview') as CampaignSegment | null

  if (preview) {
    const recipients = await getRecipients(tenant.id, preview)
    return NextResponse.json({ count: recipients.length })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('campaigns')
    .select('id, subject, segment, channel, recipient_count, sent_at')
    .eq('tenant_id', tenant.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ campaigns: data ?? [] })
}

// POST /api/campaigns — send campaign
export async function POST(request: Request) {
  const tenant = await getTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 500 })

  const body = await request.json() as {
    subject:  string
    body:     string
    segment:  CampaignSegment
  }

  if (!body.subject?.trim() || !body.body?.trim() || !body.segment) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validSegments: CampaignSegment[] = ['all', 'active_30', 'inactive_60', 'vip']
  if (!validSegments.includes(body.segment)) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 })
  }

  const recipients = await getRecipients(tenant.id, body.segment)
  if (!recipients.length) {
    return NextResponse.json({ error: 'No recipients found for this segment' }, { status: 400 })
  }

  // Send in batches of BATCH_SIZE via Resend batch API
  let sent = 0
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)
    const emails = batch.map(client => ({
      from:    `${tenant.name} <noreply@barberqueue.pro>`,
      to:      [client.email],
      subject: body.subject,
      html:    buildEmailHtml({ shopName: tenant.name, body: body.body, clientId: client.id }),
    }))

    const res = await fetch('https://api.resend.com/emails/batch', {
      method:  'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(emails),
    })

    if (res.ok) sent += batch.length
  }

  // Save campaign record
  const supabase = await createClient()
  await supabase.from('campaigns').insert({
    tenant_id:       tenant.id,
    subject:         body.subject,
    body:            body.body,
    channel:         'email',
    segment:         body.segment,
    recipient_count: sent,
  })

  return NextResponse.json({ sent, segmentLabel: SEGMENT_LABELS[body.segment] })
}
