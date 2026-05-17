import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Service-role client. Bypasses RLS — only safe inside webhook handlers
// after the WEBHOOK_SECRET has been verified, or in trusted server-only
// flows (e.g. /api/register/check-slug).
//
// Never expose this client to the browser, and never instantiate it
// from a request authenticated only by user cookies.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
