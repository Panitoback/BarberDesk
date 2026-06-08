import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/dashboard/SettingsForm'
import BookingQRCode from '@/components/dashboard/BookingQRCode'
import { validateTenantConfig, type TenantConfig } from '@/lib/tenant-config'
import { galleryPhotoUrl, type GalleryPhoto } from '@/lib/gallery'
import { logoUrl } from '@/lib/session'

export default async function SettingsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()
  const [
    { data: tenantRow },
    { data: automationsRow },
    { data: barbers },
    { data: galleryRows },
  ] = await Promise.all([
    supabase.from('tenants').select('config, multi_barber, staff_token, name').eq('id', tenant.id).single(),
    supabase.from('automations_config').select('review_link, reminder_active, reminder_hours, flash_discount_pct').eq('tenant_id', tenant.id).single(),
    supabase.from('barbers').select('*').eq('tenant_id', tenant.id).order('display_order').order('created_at'),
    supabase.from('shop_gallery').select('id, photo_path, caption, display_order').eq('tenant_id', tenant.id).order('display_order').order('created_at'),
  ])

  const initialGallery: GalleryPhoto[] = (galleryRows ?? []).map(p => ({
    id:            p.id,
    photo_path:    p.photo_path,
    caption:       p.caption,
    display_order: p.display_order,
    photo_url:     galleryPhotoUrl(p.photo_path),
  }))

  const result = validateTenantConfig(tenantRow?.config ?? {})
  const fullConfig: TenantConfig = result.ok ? result.config : {}

  // Strip secret keys before sending to the client component
  const { stripe_secret_key, stripe_webhook_secret, ...safeConfig } = fullConfig
  const initialConfig: TenantConfig = safeConfig
  const hasStripeKey            = !!stripe_secret_key
  const hasStripeWebhookSecret  = !!stripe_webhook_secret
  const initialLogoUrl          = logoUrl(fullConfig.logo_path, fullConfig.logo_updated_at)

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
          hasStripeKey={hasStripeKey}
          hasStripeWebhookSecret={hasStripeWebhookSecret}
          initialGallery={initialGallery}
          initialLogoUrl={initialLogoUrl}
          initialShopName={tenantRow?.name ?? ''}
        />
      </Suspense>
      <BookingQRCode subdomain={tenant.subdomain} />
    </div>
  )
}
