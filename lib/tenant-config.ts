// Shape of `tenants.config` (JSONB column). Filled by the owner via /settings,
// read by the AI auto-reply workflow so it stops inventing hours/prices.
import { THEME_IDS } from '@/lib/theme'

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = typeof WEEKDAYS[number]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export type DayHours = { open: string; close: string } | null
export const SERVICE_DURATIONS = [30, 45, 60, 90] as const
export type ServiceDuration = typeof SERVICE_DURATIONS[number]
export type Service  = { name: string; price_cad: number; duration_min: ServiceDuration }

export type TenantConfig = {
  hours?:                  Partial<Record<Weekday, DayHours>>
  services?:               Service[]
  address?:                string
  notification_email?:     string
  deposit_active?:         boolean
  deposit_amount_cad?:     number
  full_payment_active?:    boolean
  stripe_secret_key?:      string
  stripe_webhook_secret?:  string
  brand_theme?:            string
  logo_path?:              string
  logo_updated_at?:        number
  onboarding_done?:        boolean
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

type ValidationResult =
  | { ok: true;  config: TenantConfig }
  | { ok: false; error: string }

export function validateTenantConfig(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'config must be an object' }
  }
  const c = input as Record<string, unknown>
  const config: TenantConfig = {}

  if (c.hours !== undefined) {
    if (typeof c.hours !== 'object' || c.hours === null) {
      return { ok: false, error: 'hours must be an object' }
    }
    const raw = c.hours as Record<string, unknown>
    const hours: Partial<Record<Weekday, DayHours>> = {}
    for (const day of WEEKDAYS) {
      if (!(day in raw)) continue
      const v = raw[day]
      if (v === null) { hours[day] = null; continue }
      if (typeof v !== 'object') return { ok: false, error: `hours.${day} must be object or null` }
      const dh = v as Record<string, unknown>
      if (typeof dh.open  !== 'string' || !TIME_RE.test(dh.open))  return { ok: false, error: `hours.${day}.open must be HH:MM` }
      if (typeof dh.close !== 'string' || !TIME_RE.test(dh.close)) return { ok: false, error: `hours.${day}.close must be HH:MM` }
      hours[day] = { open: dh.open, close: dh.close }
    }
    config.hours = hours
  }

  if (c.services !== undefined) {
    if (!Array.isArray(c.services)) return { ok: false, error: 'services must be an array' }
    if (c.services.length > 30)     return { ok: false, error: 'services cannot exceed 30 entries' }
    const services: Service[] = []
    for (const [i, s] of c.services.entries()) {
      if (typeof s !== 'object' || s === null) return { ok: false, error: `services[${i}] must be object` }
      const sv = s as Record<string, unknown>
      if (typeof sv.name !== 'string') return { ok: false, error: `services[${i}].name must be string` }
      const name = sv.name.trim()
      if (name.length === 0 || name.length > 80) return { ok: false, error: `services[${i}].name must be 1-80 chars` }
      if (typeof sv.price_cad !== 'number' || !isFinite(sv.price_cad) || sv.price_cad < 0 || sv.price_cad > 10000) {
        return { ok: false, error: `services[${i}].price_cad must be 0-10000` }
      }
      // Backward compatible: legacy services without duration default to 30 min.
      let duration: ServiceDuration = 30
      if (sv.duration_min !== undefined) {
        if (typeof sv.duration_min !== 'number' || !SERVICE_DURATIONS.includes(sv.duration_min as ServiceDuration)) {
          return { ok: false, error: `services[${i}].duration_min must be one of ${SERVICE_DURATIONS.join(', ')}` }
        }
        duration = sv.duration_min as ServiceDuration
      }
      services.push({ name, price_cad: Math.round(sv.price_cad * 100) / 100, duration_min: duration })
    }
    config.services = services
  }

  if (c.address !== undefined) {
    if (typeof c.address !== 'string') return { ok: false, error: 'address must be string' }
    const addr = c.address.trim()
    if (addr.length > 200) return { ok: false, error: 'address must be ≤200 chars' }
    if (addr.length > 0) config.address = addr
  }

  if (c.notification_email !== undefined) {
    if (typeof c.notification_email !== 'string') return { ok: false, error: 'notification_email must be string' }
    const email = c.notification_email.trim().toLowerCase()
    if (email.length > 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'notification_email must be a valid email' }
      config.notification_email = email
    }
  }

  if (c.deposit_active !== undefined) {
    if (typeof c.deposit_active !== 'boolean') return { ok: false, error: 'deposit_active must be boolean' }
    config.deposit_active = c.deposit_active
  }

  if (c.full_payment_active !== undefined) {
    if (typeof c.full_payment_active !== 'boolean') return { ok: false, error: 'full_payment_active must be boolean' }
    config.full_payment_active = c.full_payment_active
  }

  if (c.deposit_amount_cad !== undefined) {
    const amt = Number(c.deposit_amount_cad)
    if (!isFinite(amt) || amt < 1 || amt > 500) return { ok: false, error: 'deposit_amount_cad must be between 1 and 500' }
    config.deposit_amount_cad = Math.round(amt * 100) / 100
  }

  if (c.stripe_secret_key !== undefined) {
    if (typeof c.stripe_secret_key !== 'string') return { ok: false, error: 'stripe_secret_key must be a string' }
    const key = c.stripe_secret_key.trim()
    if (key.length > 0) {
      if (!key.startsWith('sk_')) return { ok: false, error: 'stripe_secret_key must start with sk_' }
      if (key.length > 200) return { ok: false, error: 'stripe_secret_key too long' }
      config.stripe_secret_key = key
    }
  }

  if (c.stripe_webhook_secret !== undefined) {
    if (typeof c.stripe_webhook_secret !== 'string') return { ok: false, error: 'stripe_webhook_secret must be a string' }
    const secret = c.stripe_webhook_secret.trim()
    if (secret.length > 0) {
      if (!secret.startsWith('whsec_')) return { ok: false, error: 'stripe_webhook_secret must start with whsec_' }
      if (secret.length > 200) return { ok: false, error: 'stripe_webhook_secret too long' }
      config.stripe_webhook_secret = secret
    }
  }

  if (c.brand_theme !== undefined) {
    if (typeof c.brand_theme === 'string' && (THEME_IDS as readonly string[]).includes(c.brand_theme)) {
      config.brand_theme = c.brand_theme
    }
    // Silently ignore unknown theme ids — fall back to default
  }

  if (c.logo_path !== undefined) {
    if (typeof c.logo_path === 'string' && c.logo_path.trim().length > 0) {
      config.logo_path = c.logo_path.trim()
    }
  }

  if (c.logo_updated_at !== undefined) {
    if (typeof c.logo_updated_at === 'number' && isFinite(c.logo_updated_at)) {
      config.logo_updated_at = c.logo_updated_at
    }
  }

  if (c.onboarding_done !== undefined) {
    if (typeof c.onboarding_done === 'boolean') {
      config.onboarding_done = c.onboarding_done
    }
  }

  return { ok: true, config }
}
