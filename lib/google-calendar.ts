const TOKEN_URL  = 'https://oauth2.googleapis.com/token'
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export type CalendarEvent = {
  id:           string
  summary:      string
  start:        string   // HH:MM for timed, YYYY-MM-DD for all-day
  end:          string
  allDay:       boolean
  date:         string   // YYYY-MM-DD for grouping by day
  description?: string
  location?:    string
  htmlLink?:    string
}

export async function signOAuthState(data: Record<string, unknown>): Promise<string> {
  const secret  = process.env.WEBHOOK_SECRET ?? 'dev-secret'
  const payload = JSON.stringify({ ...data, ts: Date.now() })
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sig    = Buffer.from(sigBuf).toString('hex')
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url')
}

export async function verifyOAuthState(state: string): Promise<Record<string, unknown> | null> {
  try {
    const raw    = Buffer.from(state, 'base64url').toString('utf-8')
    const parsed = JSON.parse(raw) as { payload?: string; sig?: string }
    const { payload, sig } = parsed
    if (!payload || !sig) return null

    const secret = process.env.WEBHOOK_SECRET ?? 'dev-secret'
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )
    const sigBytes = Buffer.from(sig, 'hex')
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
    if (!valid) return null

    const data = JSON.parse(payload) as Record<string, unknown>
    if (Date.now() - Number(data.ts) > 10 * 60 * 1000) return null  // 10-min expiry
    return data
  } catch {
    return null
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID     ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json() as { access_token?: string }
  return data.access_token ?? null
}

export async function fetchCalendarEvents(
  accessToken: string,
  startISO:    string,
  endISO:      string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin:      startISO,
    timeMax:      endISO,
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '100',
  })
  const res = await fetch(`${EVENTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []

  const data = await res.json() as {
    items?: Array<{
      id:           string
      summary?:     string
      description?: string
      location?:    string
      htmlLink?:    string
      start:        { dateTime?: string; date?: string }
      end:          { dateTime?: string; date?: string }
    }>
  }

  return (data.items ?? []).map(item => {
    const allDay   = !item.start.dateTime
    const startStr = allDay ? (item.start.date ?? '') : (item.start.dateTime ?? '')
    const endStr   = allDay ? (item.end.date   ?? '') : (item.end.dateTime   ?? '')
    return {
      id:          item.id,
      summary:     item.summary ?? '(No title)',
      start:       allDay ? startStr : startStr.substring(11, 16),
      end:         allDay ? endStr   : endStr.substring(11, 16),
      allDay,
      date:        startStr.substring(0, 10),
      description: item.description,
      location:    item.location,
      htmlLink:    item.htmlLink,
    }
  })
}
