import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {

  console.log("========== AUTH CALLBACK START ==========")
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log("1. Full URL received:", request.url)
  console.log("2. Code extracted:", code ? "✅ CODE PRESENT" : "❌ NULL (empty)")

  if (code) {
    console.log("3. Entering code exchange flow...")
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
      console.log("4. ✅ Session created and cookies saved.")
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        console.log(`5. Redirecting to local env: http://localhost:3000${next}`)
        return NextResponse.redirect(`http://localhost:3000${next}`)
      }

      console.log(`5. Redirecting to production: ${origin}${next}`)
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error("4. ❌ Supabase error exchanging code:", error.message)
    }
  } else {
    console.log("3. ❌ No 'code' param found. Skipping auth.")
  }

  console.log(`=== END: Redirecting back to login with error ===\n`)
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
