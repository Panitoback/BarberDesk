export const RESERVED_SUBDOMAINS = new Set([
  // Marketing / brand — must never be a tenant
  'barberqueue', 'barberpro',
  // Infra / common
  'www', 'api', 'admin', 'dashboard', 'auth', 'login', 'register',
  'app', 'mail', 'staging', 'dev', 'test', 'support', 'help',
  // Marketing pages we may host on the apex
  'about', 'pricing', 'blog', 'docs', 'status', 'shop', 'book',
  // Common system / abuse-prone
  'root', 'security', 'billing', 'legal', 'privacy', 'terms',
])

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

export type SlugError = 'invalid_format' | 'reserved'

export function validateSlug(slug: string): SlugError | null {
  if (!SLUG_RE.test(slug)) return 'invalid_format'
  if (RESERVED_SUBDOMAINS.has(slug)) return 'reserved'
  return null
}
