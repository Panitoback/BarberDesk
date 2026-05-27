import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { extractSubdomainFromHost, SUPABASE_COOKIE_OPTIONS } from './lib/subdomain'

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // Auth callback must pass through untouched — calling getUser() here
  // can wipe the PKCE code-verifier cookie before the callback route reads it.
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  const subdomain = extractSubdomainFromHost(hostname)
  const hostnameWithoutPort = hostname.split(':')[0]
  const isLocalhost =
    hostnameWithoutPort === 'localhost' || hostnameWithoutPort.endsWith('.localhost')

  // Refresh Supabase session
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Route based on subdomain
  if (subdomain) {
    const isAuthPath =
      pathname === '/login' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password' ||
      pathname.startsWith('/auth/')
    const isApiPath = pathname.startsWith('/api/')
    const isPublicPath =
      pathname === '/book' ||
      pathname.startsWith('/book/') ||
      pathname === '/api/book' ||
      pathname.startsWith('/api/book/') ||
      // /api/errors must accept unauthenticated POSTs so client-side errors
      // from public/login/register pages reach error_logs. The route itself
      // is fail-silent and size-capped, no auth needed.
      pathname === '/api/errors'

    if (!user && !isAuthPath && !isPublicPath && !isApiPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const newHeaders = new Headers(request.headers)
    newHeaders.set('x-subdomain', subdomain)

    if (!isAuthPath && !isApiPath && !isPublicPath) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = `/dashboard${pathname === '/' ? '' : pathname}`

      const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
        request: { headers: newHeaders },
      })

      // Forward Supabase-refreshed cookies preserving every attribute
      // (sameSite, secure, httpOnly, expires, path, domain).
      response.cookies.getAll().forEach(cookie => {
        rewriteResponse.cookies.set(cookie)
      })

      return rewriteResponse
    }

    const nextResponse = NextResponse.next({ request: { headers: newHeaders } })
    response.cookies.getAll().forEach(cookie => {
      nextResponse.cookies.set(cookie)
    })
    return nextResponse
  }

  // Dev: allow accessing /dashboard/* on localhost without subdomain for testing
  if (isLocalhost && pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // No subdomain → landing zone, no restrictions
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
