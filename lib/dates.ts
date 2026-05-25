// Timezone-aware date helpers.
//
// The product runs in Toronto (per CLAUDE.md) but the server runs in UTC on
// Vercel. Using `new Date('YYYY-MM-DDTHH:MM:SS')` parses the string in the
// server's local TZ, which silently breaks same-day bookings and "today"
// queries in production. Always go through these helpers.

const TIMEZONE = 'America/Toronto'

function formatPartsInToronto(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return {
    year:   get('year'),
    month:  get('month'),
    day:    get('day'),
    hour:   get('hour'),
    minute: get('minute'),
  }
}

/** Today's date in Toronto, as YYYY-MM-DD. */
export function todayInToronto(): string {
  const { year, month, day } = formatPartsInToronto(new Date())
  return `${year}-${month}-${day}`
}

/** Current time in Toronto, as HH:MM. */
export function nowTimeInToronto(): string {
  const { hour, minute } = formatPartsInToronto(new Date())
  return `${hour}:${minute}`
}

/** Add `days` to a YYYY-MM-DD date (UTC-stable — used for end-of-range filters). */
export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

/** True if (date, time) is strictly before "now" in Toronto. */
export function isPastInToronto(date: string, time: string): boolean {
  const { year, month, day, hour, minute } = formatPartsInToronto(new Date())
  const nowKey    = `${year}-${month}-${day}T${hour}:${minute}`
  const targetKey = `${date}T${time}`
  return targetKey < nowKey
}

/**
 * Format a stored (date, time) — both naive Toronto-local strings — into a
 * human-readable phrase for SMS. e.g. "Thursday, May 22 at 5:00 PM".
 */
export function formatDateTimeForSms(date: string, time: string): string {
  // Build a Date that represents the intended Toronto instant by shifting
  // from server-local back via timeZone-aware formatting.
  const [h, m] = time.split(':').map(Number)
  const utc = new Date(`${date}T00:00:00Z`)
  utc.setUTCHours(h, m, 0, 0)
  // The above gives us the wall-clock time at UTC. To make it the wall-clock
  // time in Toronto, we don't need a shift if we only ever format with
  // timeZone: TIMEZONE — the formatter will treat the UTC instant correctly.
  // But here we want the wall-clock to literally be h:m IN TORONTO. We adjust
  // by finding the offset between UTC and Toronto for that date.
  const tzOffsetMin = torontoOffsetMinutes(utc)
  const target = new Date(utc.getTime() - tzOffsetMin * 60_000)

  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(target)

  const timePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(target)

  return `${datePart} at ${timePart}`
}

function torontoOffsetMinutes(instant: Date): number {
  // Offset of Toronto vs UTC at `instant`, in minutes (negative for west of UTC).
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0)
  const torontoAsUtc = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour'), get('minute'), get('second'),
  )
  return Math.round((torontoAsUtc - instant.getTime()) / 60_000)
}
