import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

function getCookieOptions(): { domain: string } | undefined {
  if (process.env.NODE_ENV !== 'production') return undefined
  if (typeof window === 'undefined') return { domain: '.barberqueue.pro' }
  const h = window.location.hostname
  if (h === 'salonqueue.pro' || h.endsWith('.salonqueue.pro')) {
    return { domain: '.salonqueue.pro' }
  }
  return { domain: '.barberqueue.pro' }
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: getCookieOptions() }
  )
}
