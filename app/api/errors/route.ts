import { NextResponse } from 'next/server'
import { logError } from '@/lib/error-logger'

// Unauthenticated by design — must accept errors from any page including login,
// register, public booking. Body is size-limited and sanitized in logError().
// Fail-silent: always returns 204 so the client never retries on error.

const MAX_BODY_BYTES = 16 * 1024

export async function POST(request: Request) {
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 204 })

    const body = JSON.parse(text) as {
      route?:    unknown
      message?:  unknown
      stack?:    unknown
      metadata?: unknown
    }

    const message = typeof body.message === 'string' && body.message.length > 0
      ? body.message
      : 'client_error_no_message'

    await logError({
      source:   'client',
      route:    typeof body.route === 'string' ? body.route : undefined,
      message,
      stack:    typeof body.stack === 'string' ? body.stack : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata !== null
        ? (body.metadata as Record<string, unknown>)
        : {},
    })
  } catch {
    // fail-silent
  }
  return new Response(null, { status: 204 })
}

// Block other methods (incl. GET so this never appears in browser history)
export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
