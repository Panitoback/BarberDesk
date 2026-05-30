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
    config:                  rawConfig,
    review_link:             rawReviewLink,
    reminder_active:         rawReminderActive,
    reminder_hours:          rawReminderHours,
    flash_discount_pct:      rawFlashDiscountPct,
    stripe_secret_key:       rawStripeKey,
    stripe_webhook_secret:   rawStripeWebhook,
  } = body as {
    config?:                 unknown
    review_link?:            unknown
    reminder_active?:        unknown
    reminder_hours?:         unknown
    flash_discount_pct?:     unknown
    stripe_secret_key?:      unknown
    stripe_webhook_secret?:  unknown
  }

  const result = validateTenantConfig(rawConfig ?? {})
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  // Validate stripe keys if provided
  if (rawStripeKey !== undefined && rawStripeKey !== '') {
    if (typeof rawStripeKey !== 'string' || !rawStripeKey.startsWith('sk_')) {
      return NextResponse.json({ error: 'stripe_secret_key must start with sk_' }, { status: 400 })
    }
  }
  if (rawStripeWebhook !== undefined && rawStripeWebhook !== '') {
    if (typeof rawStripeWebhook !== 'string' || !rawStripeWebhook.startsWith('whsec_')) {
      return NextResponse.json({ error: 'stripe_webhook_secret must start with whsec_' }, { status: 400 })
    }
  }

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

  // Read existing config to preserve stripe keys if not being updated
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('config')
    .eq('id', tenant.id)
    .single()

  const existingResult = validateTenantConfig(existingTenant?.config ?? {})
  const existingConfig = existingResult.ok ? existingResult.config : {}

  const mergedConfig = {
    ...existingConfig,
    ...result.config,
    // Preserve existing stripe keys unless new ones are explicitly provided
    ...(existingConfig.stripe_secret_key     && { stripe_secret_key:     existingConfig.stripe_secret_key }),
    ...(existingConfig.stripe_webhook_secret && { stripe_webhook_secret: existingConfig.stripe_webhook_secret }),
    // Override with new values if provided
    ...(rawStripeKey    && typeof rawStripeKey    === 'string' && rawStripeKey.trim()    && { stripe_secret_key:     rawStripeKey.trim() }),
    ...(rawStripeWebhook && typeof rawStripeWebhook === 'string' && rawStripeWebhook.trim() && { stripe_webhook_secret: rawStripeWebhook.trim() }),
  }

  const { error: configErr } = await supabase
    .from('tenants')
    .update({ config: mergedConfig })
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

  if (rawFlashDiscountPct !== undefined) {
    const pct = Number(rawFlashDiscountPct)
    if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      return NextResponse.json({ error: 'flash_discount_pct must be an integer between 1 and 100' }, { status: 400 })
    }
    automationsUpdate.flash_discount_pct = pct
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
