'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; route?: string }
type State = { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    try {
      fetch('/api/errors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route:   this.props.route ?? (typeof window !== 'undefined' ? window.location.pathname : null),
          message: error.message,
          stack:   error.stack ?? null,
          metadata: {
            kind:           'react.componentDidCatch',
            componentStack: info.componentStack ?? null,
          },
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // fail-silent
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <p className="text-base font-semibold text-slate-900">Something went wrong.</p>
            <p className="mt-1 text-sm text-slate-500">
              The error was logged. Try refreshing the page.
            </p>
            <button
              onClick={() => { if (typeof window !== 'undefined') window.location.reload() }}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
