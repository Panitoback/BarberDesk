import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'

// E.164 — leading + then 11–15 digits. Twilio numbers in CA/US are 12 chars
// (`+1` plus 10 digits) but we keep it generic for future markets.
const E164_RE = /^\+\d{11,15}$/

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { twilio_number?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const raw = body.twilio_number
  let value: string | null

  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
    value = null
  } else if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'twilio_number must be a string or null' }, { status: 400 })
  } else {
    const cleaned = raw.trim().replace(/[\s\-()]/g, '')
    if (!E164_RE.test(cleaned)) {
      return NextResponse.json(
        { error: 'Must be E.164 — e.g. +12494211641 (leading + and 11–15 digits).' },
        { status: 400 }
      )
    }
    value = cleaned
  }

  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tenants')
    .update({ twilio_number: value })
    .eq('id', id)
    .select('id, twilio_number')
    .single()

  if (error?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 })
  }
  if (error || !data) {
    // 23505 = unique_violation, in case we ever add UNIQUE on twilio_number
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'That number is already linked to another shop.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Could not update.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, twilio_number: data.twilio_number })
}
