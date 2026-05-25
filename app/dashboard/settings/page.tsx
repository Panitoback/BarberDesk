import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/dashboard/SettingsForm'
import { validateTenantConfig, type TenantConfig } from '@/lib/tenant-config'

export default async function SettingsPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/login')

  const supabase = await createClient()
  const [
    { data: tenantRow },
    { data: automationsRow },
  ] = await Promise.all([
    supabase.from('tenants').select('config').eq('id', tenant.id).single(),
    supabase.from('automations_config').select('review_link').eq('tenant_id', tenant.id).single(),
  ])

  // Coerce unknown JSON to a safe TenantConfig — old/malformed values become `{}`.
  const result = validateTenantConfig(tenantRow?.config ?? {})
  const initialConfig: TenantConfig = result.ok ? result.config : {}
  const initialReviewLink = automationsRow?.review_link ?? ''

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Information your AI SMS assistant uses to reply to customers. Leave anything empty
          if you&apos;d rather the assistant say &quot;I can&apos;t confirm — please call us.&quot;
        </p>
      </div>
      <SettingsForm initialConfig={initialConfig} initialReviewLink={initialReviewLink} />
    </div>
  )
}
