'use client'

import { useState } from 'react'
import { Link as LinkIcon, Copy, Check } from 'lucide-react'

export default function BookingLinkCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Older browsers — silently noop
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <LinkIcon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Your booking link
            </span>
          </div>
          <p className="text-slate-300 text-sm mb-2">
            Share this link so clients can book without calling.
          </p>
          <code className="block text-indigo-400 font-mono text-sm sm:text-base break-all">
            {url}
          </code>
        </div>

        <button
          onClick={copy}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
