'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Calendar, MessageSquare, Settings, LogOut, Scissors, Menu, X, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard, exact: true },
  { href: '/clients',     label: 'Clients',     icon: Users,           exact: false },
  { href: '/automations', label: 'Automations', icon: Zap,             exact: false },
  { href: '/settings',    label: 'Settings',    icon: Settings,        exact: false },
]

const comingSoonItems = [
  { label: 'Appointments', icon: Calendar },
  { label: 'Messages',     icon: MessageSquare },
]

export default function SidebarNav({ shopName }: { shopName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setOpen(false) }, [pathname])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-16 bg-slate-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Scissors className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="text-white font-semibold truncate">{shopName}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-slate-400 hover:text-white p-2 -mr-2"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50"
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static column on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transform transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Scissors className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">BarberQueue</span>
            </div>
            <p className="text-white font-semibold text-lg leading-tight truncate">{shopName}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden text-slate-400 hover:text-white shrink-0 -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}

          <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
            {comingSoonItems.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed select-none"
                title="Coming soon"
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className="ml-auto text-[10px] text-slate-600 font-normal">Soon</span>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
