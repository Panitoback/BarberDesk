import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/dashboard/SettingsForm'
import BookingQRCode from '@/components/dashboard/BookingQRCode'
import { validateTenantConfig, type TenantConfig } from '@/lib/tenant-config'

export default async function SettingsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()
  const [
    { data: tenantRow },
    { data: automationsRow },
    { data: barbers },
  ] = await Promise.all([
    supabase.from('tenants').select('config, multi_barber, staff_token').eq('id', tenant.id).single(),
    supabase.from('automations_config').select('review_link, reminder_active, reminder_hours, flash_discount_pct').eq('tenant_id', tenant.id).single(),
    supabase.from('barbers').select('*').eq('tenant_id', tenant.id).order('display_order').order('created_at'),
  ])

  const result = validateTenantConfig(tenantRow?.config ?? {})
  const initialConfig: TenantConfig = result.ok ? result.config : {}
  const initialReviewLink       = automationsRow?.review_link       ?? ''
  const initialReminderActive   = automationsRow?.reminder_active   ?? true
  const initialReminderHours    = automationsRow?.reminder_hours    ?? 24
  const initialFlashDiscountPct = automationsRow?.flash_discount_pct ?? 20

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Information your AI SMS assistant uses to reply to customers. Leave anything empty
          if you&apos;d rather the assistant say &quot;I can&apos;t confirm — please call us.&quot;
        </p>
      </div>
      <Suspense fallback={<div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />}>
        <SettingsForm
          initialConfig={initialConfig}
          initialReviewLink={initialReviewLink}
          initialReminderActive={initialReminderActive}
          initialReminderHours={initialReminderHours}
          initialFlashDiscountPct={initialFlashDiscountPct}
          initialBarbers={barbers ?? []}
          multiBarber={tenantRow?.multi_barber ?? false}
          staffToken={tenantRow?.staff_token ?? null}
          subdomain={tenant.subdomain}
        />
      </Suspense>
      <BookingQRCode subdomain={tenant.subdomain} />
    </div>
  )
}
