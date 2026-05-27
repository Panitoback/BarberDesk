// Bookable time slots per date are derived from the shop's configured hours
// (tenant.config.hours[weekday]). Used by /api/book/slots (server) and by
// BookingForm + NewAppointmentButton (client) so neither side hard-codes a
// 8am-8pm grid that doesn't match the shop's actual opening time.

import type { DayHours, TenantConfig, Weekday } from '@/lib/tenant-config'
import { WEEKDAYS } from '@/lib/tenant-config'

/** Weekday of a YYYY-MM-DD ISO date, anchored to UTC so server/client agree. */
export function weekdayForISO(dateISO: string): Weekday | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null
  const d = new Date(`${dateISO}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  // getUTCDay: 0=Sun, 1=Mon, ..., 6=Sat → align to our 'mon'..'sun' ordering.
  const jsToWeekday: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return jsToWeekday[d.getUTCDay()]
}

/**
 * 30-min slots that fit inside `[open, close)`. Last slot starts 30 min before
 * close, so a 09:00-18:00 day yields 09:00, 09:30, ..., 17:30.
 * Returns [] when hours is null (shop closed) or malformed.
 */
export function generateSlotsForHours(hours: DayHours): string[] {
  if (!hours) return []
  const [openH, openM] = hours.open.split(':').map(Number)
  const [closeH, closeM] = hours.close.split(':').map(Number)
  if (!Number.isFinite(openH) || !Number.isFinite(closeH)) return []

  const start = openH * 60 + openM
  const end   = closeH * 60 + closeM
  if (end <= start) return []

  const out: string[] = []
  // Snap to the 30-min grid: round up if open is not already on :00 or :30.
  let cursor = Math.ceil(start / 30) * 30
  while (cursor + 30 <= end) {
    const h = Math.floor(cursor / 60)
    const m = cursor % 60
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    cursor += 30
  }
  return out
}

/** Slots available on a given date, given the tenant's config. */
export function getSlotsForDate(config: TenantConfig | null | undefined, dateISO: string): string[] {
  const weekday = weekdayForISO(dateISO)
  if (!weekday) return []
  const hours = config?.hours?.[weekday]
  // No hours configured at all → fall back to the legacy 09:00-20:00 default
  // so tenants that haven't filled in Settings still get a usable grid.
  if (hours === undefined && !config?.hours) {
    return generateSlotsForHours({ open: '09:00', close: '20:00' })
  }
  return generateSlotsForHours(hours ?? null)
}

export { WEEKDAYS }
