// Pre-launch error capture. Inserts into public.error_logs via service-role.
// MUST be fail-silent — if the logger itself throws, the original request
// continues unaffected. Never wrap this in code that depends on its result.

import { createAdminClient } from '@/lib/supabase/admin'
import type { TablesInsert } from '@/lib/supabase/types'

const SENSITIVE_KEYS = new Set([
  'password', 'pass', 'token', 'secret', 'authorization',
  'api_key', 'apikey', 'access_token', 'refresh_token',
  // PII — CASL/PIPEDA: never persist client contact details in error logs.
  'phone', 'email', 'phone_number',
])

const MAX_STRING_LENGTH = 2000
const MAX_STACK_LENGTH  = 4000

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) + '…' : value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitize(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) { out[k] = '[redacted]'; continue }
      out[k] = sanitize(v, depth + 1)
    }
    return out
  }
  return String(value)
}

export type LogErrorInput = {
  source?:      'server' | 'client'
  route?:       string
  method?:      string
  status?:      number
  tenantId?:    string | null
  userId?:      string | null
  message:      string
  errorCode?:   string | null
  stack?:       string | null
  metadata?:    Record<string, unknown>
  requestBody?: unknown
}

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const supabase = createAdminClient()
    const msg = (input.message ?? '').slice(0, MAX_STRING_LENGTH) || 'unknown_error'
    const stack = input.stack ? input.stack.slice(0, MAX_STACK_LENGTH) : null

    const row: TablesInsert<'error_logs'> = {
      source:       input.source       ?? 'server',
      route:        input.route        ?? null,
      method:       input.method       ?? null,
      status:       input.status       ?? null,
      tenant_id:    input.tenantId     ?? null,
      user_id:      input.userId       ?? null,
      message:      msg,
      error_code:   input.errorCode    ?? null,
      stack,
      metadata:     sanitize(input.metadata ?? {}) as TablesInsert<'error_logs'>['metadata'],
      request_body: input.requestBody !== undefined ? (sanitize(input.requestBody) as TablesInsert<'error_logs'>['request_body']) : null,
    }
    await supabase.from('error_logs').insert(row)
  } catch {
    // Fail-silent. Logger errors must never bubble up to the caller.
  }
}

/**
 * Extract a sensible (message, code, stack) tuple from an unknown thrown value.
 */
export function describeError(e: unknown): { message: string; code: string | null; stack: string | null } {
  if (e instanceof Error) {
    const code = (e as { code?: unknown }).code
    return {
      message: e.message,
      code:    typeof code === 'string' ? code : null,
      stack:   e.stack ?? null,
    }
  }
  if (typeof e === 'object' && e !== null) {
    const obj = e as { message?: unknown; code?: unknown }
    return {
      message: typeof obj.message === 'string' ? obj.message : JSON.stringify(e),
      code:    typeof obj.code === 'string' ? obj.code : null,
      stack:   null,
    }
  }
  return { message: String(e), code: null, stack: null }
}
