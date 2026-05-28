import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { todayInToronto } from '@/lib/dates'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    date:       rawDate,
    start_time: rawStart,
    end_time:   rawEnd,
    reason:     rawReason,
    all_day:    rawAllDay,
  } = body as Record<string, unknown>

  const date    = typeof rawDate   === 'string' ? rawDate.trim()   : ''
  const allDay  = rawAllDay === true
  const reason  = typeof rawReason === 'string' ? rawReason.trim().slice(0, 200) : null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
  }
  if (date < todayInToronto()) {
    return NextResponse.json({ error: 'Cannot block a past date.' }, { status: 400 })
  }

  let startTime = '00:00'
  let endTime   = '23:59'
  if (!allDay) {
    startTime = typeof rawStart === 'string' ? rawStart.trim().slice(0, 5) : ''
    endTime   = typeof rawEnd   === 'string' ? rawEnd.trim().slice(0, 5)   : ''
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return NextResponse.json({ error: 'Invalid start/end time.' }, { status: 400 })
    }
    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End must be after start.' }, { status: 400 })
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Warn (but don't auto-cancel) the owner if any active appointment overlaps
  // the block range. An appointment overlaps [start, end) when its own
  // [apptStart, apptStart+duration) range intersects — we can't express that
  // purely in SQL with TIME columns, so we fetch the day's appointments and
  // filter in JS.
  const { data: dayAppts } = await supabase
    .from('appointments')
    .select('time, duration_min')
    .eq('tenant_id', tenant.id)
    .eq('date', date)
    .in('status', ['pending', 'completed'])

  const toMin = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }
  const blockStart = toMin(startTime)
  const blockEnd   = toMin(endTime)
  const hasOverlap = (dayAppts ?? []).some(a => {
    const aStart = toMin(a.time)
    const aEnd   = aStart + (a.duration_min ?? 30)
    return aStart < blockEnd && aEnd > blockStart
  })

  if (hasOverlap) {
    return NextResponse.json(
      { error: 'There are appointments inside this range. Cancel them first, then block the time.' },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('time_blocks').insert({
    tenant_id:  tenant.id,
    date,
    start_time: startTime,
    end_time:   endTime,
    reason:     reason && reason.length > 0 ? reason : null,
    all_day:    allDay,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
