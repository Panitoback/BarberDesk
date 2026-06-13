// Signed unsubscribe tokens. Prevents IDOR: without the HMAC anyone could
// unsubscribe any client by guessing/iterating UUIDs in ?c=. Unlike the
// Calendar OAuth state there is NO expiry — unsubscribe links live in already
// delivered emails and must keep working indefinitely.

import { createHmac, timingSafeEqual } from 'crypto'

function sign(clientId: string): string {
  const secret = process.env.WEBHOOK_SECRET ?? 'dev-secret'
  return createHmac('sha256', secret).update(clientId).digest('hex').slice(0, 32)
}

/** Returns the `c` query value: `<clientId>.<sig>`. */
export function makeUnsubscribeToken(clientId: string): string {
  return `${clientId}.${sign(clientId)}`
}

/** Verifies a token and returns the clientId, or null if tampered/malformed. */
export function verifyUnsubscribeToken(token: string): string | null {
  const idx = token.lastIndexOf('.')
  if (idx <= 0) return null
  const clientId = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  const expected = sign(clientId)
  if (sig.length !== expected.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  return clientId
}
