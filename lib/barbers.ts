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

/**
 * Returns the barber's custom hours if set, otherwise the shop's hours.
 * Returns undefined when neither is configured — callers must use the
 * original TenantConfig directly so getSlotsForDate can apply its own
 * 09:00-20:00 fallback (passing an empty {} object breaks that fallback
 * because !{} === false in JS).
 */
export function effectiveHoursForBarber(
  barber: Pick<Barber, 'hours'>,
  shopConfig: TenantConfig,
): BarberHours | undefined {
  if (barber.hours && Object.keys(barber.hours).length > 0) {
    return barber.hours
  }
  return shopConfig.hours as BarberHours | undefined
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

/** Stable color per barber based on display_order (cycles through 4 colors). */
export const BARBER_COLORS = [
  { border: 'border-l-indigo-400', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
  { border: 'border-l-emerald-400', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  { border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  { border: 'border-l-rose-400', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
] as const

export function barberColor(index: number) {
  return BARBER_COLORS[index % BARBER_COLORS.length]
}
