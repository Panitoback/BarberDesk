import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_LEN = 2000

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: { notes?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (body.notes !== null && typeof body.notes !== 'string') {
    return NextResponse.json({ error: 'notes must be string or null' }, { status: 400 })
  }

  const notes =
    body.notes === null || body.notes === ''
      ? null
      : (body.notes as string).slice(0, MAX_LEN)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS filters by tenant ownership; no extra tenant_id check needed.
  const { error } = await supabase
    .from('clients')
    .update({ notes })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
