import Link from 'next/link'
import { Scissors } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-slate-900 tracking-tight">BarberQueue</span>
          </Link>
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm transition-colors">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 sm:py-16">
        <article className="prose prose-zinc max-w-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:tracking-tight [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-slate-600 [&_li]:mb-2 [&_a]:text-indigo-600 [&_a]:underline">
          {children}
        </article>
      </main>

      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-3xl mx-auto text-slate-500 text-xs text-center">
          © 2026 BarberQueue · <Link href="/privacy" className="hover:text-slate-900">Privacy</Link> · <Link href="/terms" className="hover:text-slate-900">Terms</Link> · <Link href="/refund" className="hover:text-slate-900">Refund</Link>
        </div>
      </footer>
    </div>
  )
}
