import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'
import type { Database } from '@/lib/supabase/types'

type AutomationsUpdate = Database['public']['Tables']['automations_config']['Update']

export async function POST(request: Request) {
  const subdomain = await getSubdomain()
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const {
    config:          rawConfig,
    review_link:     rawReviewLink,
    reminder_active: rawReminderActive,
    reminder_hours:  rawReminderHours,
  } = body as {
    config?:          unknown
    review_link?:     unknown
    reminder_active?: unknown
    reminder_hours?:  unknown
  }

  const result = validateTenantConfig(rawConfig ?? {})
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  let reviewLink: string | null = null
  if (rawReviewLink !== undefined) {
    if (typeof rawReviewLink !== 'string') {
      return NextResponse.json({ error: 'review_link must be a string' }, { status: 400 })
    }
    const trimmed = rawReviewLink.trim()
    if (trimmed.length > 500) {
      return NextResponse.json({ error: 'review_link must be ≤500 chars' }, { status: 400 })
    }
    if (trimmed.length > 0 && !/^https?:\/\//i.test(trimmed)) {
      return NextResponse.json({ error: 'review_link must start with http:// or https://' }, { status: 400 })
    }
    reviewLink = trimmed.length > 0 ? trimmed : null
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

  const { error: configErr } = await supabase
    .from('tenants')
    .update({ config: result.config })
    .eq('id', tenant.id)

  if (configErr) return NextResponse.json({ error: 'Could not save settings' }, { status: 500 })

  const automationsUpdate: AutomationsUpdate = {}

  if (rawReviewLink !== undefined) {
    automationsUpdate.review_link = reviewLink
  }

  if (rawReminderActive !== undefined) {
    if (typeof rawReminderActive !== 'boolean') {
      return NextResponse.json({ error: 'reminder_active must be a boolean' }, { status: 400 })
    }
    automationsUpdate.reminder_active = rawReminderActive
  }

  if (rawReminderHours !== undefined) {
    const h = Number(rawReminderHours)
    if (!Number.isInteger(h) || h < 1 || h > 72) {
      return NextResponse.json({ error: 'reminder_hours must be between 1 and 72' }, { status: 400 })
    }
    automationsUpdate.reminder_hours = h
  }

  if (Object.keys(automationsUpdate).length > 0) {
    const { error: autoErr } = await supabase
      .from('automations_config')
      .update(automationsUpdate)
      .eq('tenant_id', tenant.id)

    if (autoErr) return NextResponse.json({ error: 'Could not save automation settings' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
