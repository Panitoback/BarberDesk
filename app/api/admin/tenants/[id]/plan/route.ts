import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'

const VALID_PLANS = ['trial', 'active', 'suspended'] as const
type Plan = typeof VALID_PLANS[number]

function isPlan(s: unknown): s is Plan {
  return typeof s === 'string' && (VALID_PLANS as readonly string[]).includes(s)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { plan?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!isPlan(body.plan)) {
    return NextResponse.json(
      { error: `plan must be one of: ${VALID_PLANS.join(', ')}` },
      { status: 400 }
    )
  }

  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tenants')
    .update({ plan: body.plan })
    .eq('id', id)
    .select('id, plan')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, plan: data.plan })
}
