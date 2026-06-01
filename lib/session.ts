import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSubdomain } from '@/lib/subdomain'
import { validateTenantConfig } from '@/lib/tenant-config'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export function logoUrl(logoPath: string | null | undefined, updatedAt?: number | null): string | null {
  if (!logoPath) return null
  const base = `${SUPABASE_URL}/storage/v1/object/public/tenant-logos/${logoPath}`
  return updatedAt ? `${base}?t=${updatedAt}` : base
}

export const getTenant = cache(async () => {
  const subdomain = await getSubdomain()
  if (!subdomain) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, subdomain, config')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) return null

  const result = validateTenantConfig(tenant.config ?? {})
  const config = result.ok ? result.config : {}

  return {
    id:             tenant.id,
    name:           tenant.name,
    subdomain:      tenant.subdomain,
    brandTheme:     config.brand_theme,
    logoUrl:        logoUrl(config.logo_path, config.logo_updated_at),
    onboardingDone: config.onboarding_done === true,
  }
})
