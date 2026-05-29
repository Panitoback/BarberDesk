import type { TenantConfig, DayHours, Weekday } from '@/lib/tenant-config'

export type BarberHours = Partial<Record<Weekday, DayHours>>

export type Barber = {
  id: string
  tenant_id: string
  name: string
  active: boolean
  email: string | null
  photo_path: string | null
  bio: string | null
  price_modifier: number
  hours: BarberHours | null
  display_order: number
  created_at: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export function barberPhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null
  return `${SUPABASE_URL}/storage/v1/object/public/barber-photos/${photoPath}`
}

export function effectiveHoursForBarber(
  barber: Pick<Barber, 'hours'>,
  shopConfig: TenantConfig,
): BarberHours {
  if (barber.hours && Object.keys(barber.hours).length > 0) {
    return barber.hours
  }
  return (shopConfig.hours as BarberHours | undefined) ?? {}
}

export function applyPriceModifier(basePrice: number, modifier: number): number {
  return Math.round(basePrice * modifier * 100) / 100
}

/** Format price_modifier for display: 1.0 → "", 1.2 → "+20%", 0.85 → "-15%" */
export function formatPriceModifier(modifier: number): string {
  if (modifier === 1) return ''
  const pct = Math.round((modifier - 1) * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}
