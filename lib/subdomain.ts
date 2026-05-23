import { headers } from 'next/headers'

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/

export function extractSubdomainFromHost(host: string): string | null {
  const hostnameWithoutPort = host.split(':')[0]
  if (IPV4_RE.test(hostnameWithoutPort)) return null

  const isLocalhost =
    hostnameWithoutPort === 'localhost' || hostnameWithoutPort.endsWith('.localhost')

  const parts = hostnameWithoutPort.split('.')
  const minParts = isLocalhost ? 2 : 3

  if (parts.length < minParts) return null
  if (parts[0] === 'www') return null
  return parts[0]
}

export async function getSubdomain(): Promise<string | null> {
  const h = await headers()
  return h.get('x-subdomain')
}

export const COOKIE_DOMAIN =
  process.env.NODE_ENV === 'production' ? '.barberqueue.pro' : undefined

export const SUPABASE_COOKIE_OPTIONS = COOKIE_DOMAIN
  ? { domain: COOKIE_DOMAIN }
  : undefined
