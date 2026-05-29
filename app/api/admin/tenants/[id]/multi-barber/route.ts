import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { enabled?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
  }

  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tenants')
    .update({ multi_barber: body.enabled })
    .eq('id', id)
    .select('id, multi_barber')
    .single()

  if (error?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 })
  }
  if (error || !data) {
    return NextResponse.json({ error: 'Could not update.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, multi_barber: data.multi_barber })
}
