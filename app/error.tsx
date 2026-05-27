'use client'

// Route-level error boundary for non-root errors. Keeps the layout/sidebar
// intact and shows an inline error UI in place of the failing segment.

import { useEffect } from 'react'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    try {
      fetch('/api/errors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route:   typeof window !== 'undefined' ? window.location.pathname : null,
          message: error.message || 'route_error',
          stack:   error.stack ?? null,
          metadata: { kind: 'next.error', digest: error.digest ?? null },
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // fail-silent
    }
  }, [error])

  return (
    <div className="min-h-[40vh] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-base font-semibold text-slate-900">Something went wrong.</p>
        <p className="mt-1 text-sm text-slate-500">The error was logged. Try again.</p>
        <button
          onClick={() => reset()}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
