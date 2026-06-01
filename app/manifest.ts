import type { MetadataRoute } from 'next'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTheme } from '@/lib/theme'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const subdomain = await getSubdomain()

  let name      = 'BarberQueue'
  let shortName = 'BarberQueue'
  let themeColor = '#4f46e5'
  let bgColor    = '#0f172a'

  if (subdomain) {
    try {
      const supabase = createAdminClient()
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, config')
        .eq('subdomain', subdomain)
        .single()

      if (tenant) {
        name      = tenant.name
        shortName = tenant.name.length > 12 ? tenant.name.slice(0, 11) + '…' : tenant.name
        const cfg   = tenant.config as { brand_theme?: string } | null
        const theme = getTheme(cfg?.brand_theme)
        themeColor  = theme.accent
        bgColor     = theme.bg
      }
    } catch {
      // Fall through to defaults — non-critical path
    }
  }

  return {
    name,
    short_name:       shortName,
    description:      'Barbershop management software',
    start_url:        '/',
    display:          'standalone',
    background_color: bgColor,
    theme_color:      themeColor,
    orientation:      'portrait',
    icons: [
      {
        src:   '/icons/icon-192.png',
        sizes: '192x192',
        type:  'image/png',
      },
      {
        src:   '/icons/icon-512.png',
        sizes: '512x512',
        type:  'image/png',
      },
      {
        src:     '/icons/icon-512.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'productivity'],
  }
}
