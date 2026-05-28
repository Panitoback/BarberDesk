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
  if (hours === undefined && !config?.hours) {
    return generateSlotsForHours({ open: '09:00', close: '20:00' })
  }
  return generateSlotsForHours(hours ?? null)
}

/** "HH:MM" → minutes since midnight. Returns NaN for malformed input. */
function timeToMin(t: string): number {
  if (!/^\d{2}:\d{2}/.test(t)) return NaN
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** A booked appointment that occupies one or more consecutive 30-min slots. */
export type TakenAppointment = { time: string; duration_min: number }

/** An owner-defined block on the calendar (vacation, lunch, etc.). */
export type TimeBlock = {
  start_time: string  // "HH:MM" or "HH:MM:SS"
  end_time:   string
  all_day?:   boolean
}

/**
 * Expand each time block to the full set of 30-min slots it covers. A block
 * 12:00–13:00 returns ["12:00", "12:30"]. all_day=true expands to every slot
 * inside the day's opening hours.
 */
export function expandBlockedSlots(
  blocks: TimeBlock[],
  daySlots: string[],
): string[] {
  const out = new Set<string>()
  for (const b of blocks) {
    if (b.all_day) {
      for (const s of daySlots) out.add(s)
      continue
    }
    const start = timeToMin(b.start_time)
    const end   = timeToMin(b.end_time)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue
    for (const s of daySlots) {
      const slotStart = timeToMin(s)
      // A 30-min slot is blocked iff it overlaps [start, end).
      if (slotStart + 30 > start && slotStart < end) out.add(s)
    }
  }
  return Array.from(out)
}

/**
 * Expand each booked appointment to the full set of 30-min slots it occupies.
 * A 60-min booking at 10:00 returns ["10:00", "10:30"].
 */
export function expandTakenSlots(taken: TakenAppointment[]): string[] {
  const out = new Set<string>()
  for (const t of taken) {
    const start = timeToMin(t.time)
    if (!Number.isFinite(start)) continue
    const blocks = Math.max(1, Math.ceil(t.duration_min / 30))
    for (let i = 0; i < blocks; i++) {
      out.add(minToTime(start + i * 30))
    }
  }
  return Array.from(out)
}

/**
 * Slots where a NEW booking of `durationMin` can start: every slot must have
 * enough consecutive 30-min slots free AND inside opening hours to fit the
 * requested duration. A 60-min service at 17:30 on a shop closing 18:00 would
 * be rejected (needs two consecutive slots, only one fits before close).
 */
export function getStartableSlots(
  config: TenantConfig | null | undefined,
  dateISO: string,
  takenSlots: string[],
  durationMin: number,
): string[] {
  const allSlots = getSlotsForDate(config, dateISO)
  if (allSlots.length === 0) return []
  const takenSet = new Set(takenSlots)
  const blocksNeeded = Math.max(1, Math.ceil(durationMin / 30))
  const slotIndex = new Map(allSlots.map((s, i) => [s, i]))

  const out: string[] = []
  for (const start of allSlots) {
    const idx = slotIndex.get(start)!
    let ok = true
    for (let i = 0; i < blocksNeeded; i++) {
      const slot = allSlots[idx + i]
      if (slot === undefined || takenSet.has(slot)) { ok = false; break }
    }
    if (ok) out.push(start)
  }
  return out
}

export { WEEKDAYS }
