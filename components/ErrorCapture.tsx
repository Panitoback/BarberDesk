'use client'

// Captures unhandled client-side errors and ships them to /api/errors.
// Covers: synchronous throws via window.onerror, unhandled Promise
// rejections via window.onunhandledrejection. React component errors
// require a separate ErrorBoundary (see ErrorBoundary.tsx).

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function send(route: string, message: string, stack: string | null, metadata: Record<string, unknown>) {
  try {
    fetch('/api/errors', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ route, message, stack, metadata }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // never let the logger crash the page
  }
}

export default function ErrorCapture() {
  const pathname = usePathname()

  useEffect(() => {
    function onError(ev: ErrorEvent) {
      send(pathname, ev.message || 'window.onerror', ev.error?.stack ?? null, {
        kind:     'window.onerror',
        filename: ev.filename,
        lineno:   ev.lineno,
        colno:    ev.colno,
      })
    }
    function onRejection(ev: PromiseRejectionEvent) {
      const reason = ev.reason
      const message =
        reason instanceof Error ? reason.message :
        typeof reason === 'string' ? reason :
        'unhandled_promise_rejection'
      const stack = reason instanceof Error ? reason.stack ?? null : null
      send(pathname, message, stack, { kind: 'unhandledrejection' })
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [pathname])

  return null
}
