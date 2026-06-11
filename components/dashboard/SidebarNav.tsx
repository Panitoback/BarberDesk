'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Settings, LogOut, Scissors, Menu, X, Zap, CalendarDays, BarChart2, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/dashboard/NotificationBell'

const navItems = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard, exact: true },
  { href: '/agenda',      label: 'Agenda',      icon: CalendarDays,    exact: false },
  { href: '/analytics',   label: 'Analytics',   icon: BarChart2,       exact: false },
  { href: '/payroll',     label: 'Payroll',     icon: Wallet,          exact: false },
  { href: '/clients',     label: 'Clients',     icon: Users,           exact: false },
  { href: '/automations', label: 'Automations', icon: Zap,             exact: false },
  { href: '/settings',    label: 'Settings',    icon: Settings,        exact: false },
]

type Props = {
  shopName: string
  logoUrl:  string | null
}

export default function SidebarNav({ shopName, logoUrl }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarStyle = {
    background: 'var(--theme-bg, #0f172a)',
  }

  const activeLinkStyle = {
    background: 'var(--theme-accent, #4f46e5)',
    color:      'var(--theme-accent-text, #ffffff)',
  }

  return (
    <>
      {/* Mobile top bar */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-30 h-16 flex items-center justify-between px-4"
        style={sidebarStyle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0">
              <Image src={logoUrl} alt={shopName} fill className="object-contain" sizes="32px" />
            </div>
          ) : (
            <Scissors className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-accent, #818cf8)' }} />
          )}
          <span className="text-white font-semibold truncate">{shopName}</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="text-slate-400 hover:text-white p-2 -mr-2"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={sidebarStyle}
      >
        {/* Brand header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {logoUrl ? (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden mb-2">
                <Image src={logoUrl} alt={shopName} fill className="object-contain" sizes="40px" />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--theme-accent, #818cf8)' }}>
                <Scissors className="w-5 h-5" />
                <span className="text-xs font-semibold uppercase tracking-widest">BarberQueue</span>
              </div>
            )}
            <p className="text-white font-semibold text-lg leading-tight truncate">{shopName}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden md:block">
              <NotificationBell align="left" />
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="md:hidden text-slate-400 hover:text-white -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? '' : 'hover:bg-white/10'
                }`}
                style={active ? activeLinkStyle : undefined}
              >
                <Icon className={`w-4 h-4 ${active ? '' : 'text-slate-400'}`} />
                <span className={active ? '' : 'text-slate-400 hover:text-white'}>
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
