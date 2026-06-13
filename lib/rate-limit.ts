// In-memory sliding-window rate limiter for public, unauthenticated routes.
//
// CAVEAT: state lives in the serverless instance's memory, so it is NOT shared
// across Vercel's concurrent instances. It reliably throttles a single attacker
// hammering one warm instance (the common abuse pattern) and is a cheap first
// line of defence in front of the DB-backed per-phone / per-tenant guards — but
// it is not a hard global limit. If abuse persists across instances, move this
// to a shared store (e.g. Upstash Redis) keeping the same `rateLimit()` shape.

const buckets = new Map<string, number[]>()

// Periodic sweep so abandoned keys don't leak memory across many distinct IPs.
let callsSinceSweep = 0
const SWEEP_EVERY = 500

function sweep(now: number) {
  for (const [key, hits] of buckets) {
    if (hits.length === 0 || hits[hits.length - 1] < now - 24 * 60 * 60_000) {
      buckets.delete(key)
    }
  }
}

/** Best-effort client IP from proxy headers. Falls back to 'unknown'. */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Returns `true` if the call is allowed, `false` if it exceeds `limit` within
 * the trailing `windowMs`. Each allowed call is recorded against `key`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const cutoff = now - windowMs

  if (++callsSinceSweep >= SWEEP_EVERY) {
    callsSinceSweep = 0
    sweep(now)
  }

  const hits = (buckets.get(key) ?? []).filter(t => t > cutoff)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  return true
}
