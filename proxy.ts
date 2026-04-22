import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // Strip port for subdomain detection
  const hostnameWithoutPort = hostname.split(':')[0]
  const isLocalhost = hostnameWithoutPort === 'localhost' || hostnameWithoutPort.endsWith('.localhost')

  let subdomain: string | null = null

  // Detect subdomain
  if (isLocalhost) {
    const parts = hostnameWithoutPort.split('.')
    if (parts.length > 1 && parts[0] !== 'www') {
      subdomain = parts[0]
    }
  } else {
    const parts = hostnameWithoutPort.split('.')
    if (parts.length > 2 && parts[0] !== 'www') {
      subdomain = parts[0]
    }
  }

  // Refresh Supabase session
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    const isAuthPath = pathname === '/login' || pathname.startsWith('/auth/')
    const isApiPath = pathname.startsWith('/api/')

    if (!user && !isAuthPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const newHeaders = new Headers(request.headers)
    newHeaders.set('x-subdomain', subdomain)

    if (!isAuthPath && !isApiPath) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = `/dashboard${pathname === '/' ? '' : pathname}`

      const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
        request: { headers: newHeaders }
      })

      response.cookies.getAll().forEach(cookie => {
        rewriteResponse.cookies.set(cookie.name, cookie.value)
      })

      return rewriteResponse
    }

    const nextResponse = NextResponse.next({ request: { headers: newHeaders } })
    response.cookies.getAll().forEach(cookie => {
      nextResponse.cookies.set(cookie.name, cookie.value)
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
