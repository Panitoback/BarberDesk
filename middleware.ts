import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // --- Detectar subdominio ---
  const isLocalhost = hostname.includes('localhost')
  let subdomain: string | null = null

  if (isLocalhost) {
    // carlos.localhost:3000 → "carlos"
    const [sub] = hostname.split('.')
    if (sub !== 'localhost' && sub !== 'www') subdomain = sub
  } else {
    // carlos.barberpro.ca → "carlos"
    const parts = hostname.split('.')
    if (parts.length > 2 && parts[0] !== 'www') subdomain = parts[0]
  }

  // --- Refrescar sesión de Supabase ---
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

  // --- Routing según subdominio ---
  if (subdomain) {
    // Zona de dashboard: proteger rutas salvo /login y /auth/*
    const isPublicPath = pathname === '/login' || pathname.startsWith('/auth/')

    if (!user && !isPublicPath) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Pasar el subdominio como header para Server Components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-subdomain', subdomain)

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Sin subdominio → zona landing, sin restricciones
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
