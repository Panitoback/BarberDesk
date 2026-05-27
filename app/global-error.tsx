'use client'

// Next.js App Router global error boundary. Catches uncaught errors in
// the React tree (including server components rendered into the client).
// Must render <html> and <body> because it replaces the root layout.

import { useEffect } from 'react'

export default function GlobalError({
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
          message: error.message || 'global_error',
          stack:   error.stack ?? null,
          metadata: { kind: 'next.global-error', digest: error.digest ?? null },
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // fail-silent
    }
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center max-w-sm">
          <p className="text-base font-semibold text-slate-900">Something went wrong.</p>
          <p className="mt-1 text-sm text-slate-500">
            The error was logged. Try again, or reload the page.
          </p>
          <div className="mt-4 flex gap-2 justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
            >
              Try again
            </button>
            <button
              onClick={() => { if (typeof window !== 'undefined') window.location.reload() }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
