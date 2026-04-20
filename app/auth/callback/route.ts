import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {

  console.log("========== CALLBACK INICIADO ==========")
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log("1. URL Completa recibida:", request.url)
  console.log("2. Código extraído:", code ? "✅ SÍ HAY CÓDIGO" : "❌ NULL (Vacío)")

  if (code) {
    console.log("3. Entrando al flujo de intercambio de código...")
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.log("4. ✅ Sesión creada en Supabase y cookies guardadas.")
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
    
      if (isLocalEnv) {
        console.log(`5. Redirigiendo a entorno local: http://localhost:3000${next}`)
        return NextResponse.redirect(`http://localhost:3000${next}`)
      }
    
      console.log(`5. Redirigiendo a produccion: http://localhost:3000${next}`)
      return NextResponse.redirect(`${origin}${next}`)
  }else{
    console.error("4. ❌ Error de Supabase al intercambiar código:", error.message)
  }
  }else{
    console.log("3. ❌ No se encontró 'code' en los parámetros. Saltando autenticación.")
  }
  console.log(`=== FIN: Redirigiendo de vuelta al login con error ===\n`)
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
