import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Scissors, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin')
  }

  // notFound() rather than redirect — don't leak that /admin exists to
  // signed-in non-admins.
  if (!isAdmin(user.id)) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <Scissors className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="text-white font-semibold tracking-tight">BarberQueue</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-indigo-400 ml-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </span>
          </Link>
          <span className="text-xs text-slate-500 truncate max-w-[200px]">{user.email}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 sm:py-12">
        {children}
      </main>
    </div>
  )
}
