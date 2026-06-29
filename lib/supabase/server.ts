import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { cookieOptionsForHost } from '../subdomain'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  const h = await headers()
  const host = h.get('host') ?? ''

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieOptionsForHost(host),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In Server Components cookies can only be written from
            // Server Actions or Route Handlers — ignore silently.
          }
        },
      },
    }
  )
}
