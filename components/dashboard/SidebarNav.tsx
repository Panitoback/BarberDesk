'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, MessageSquare, Settings, LogOut, Scissors } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard',          label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/clients',  label: 'Clients',   icon: Users,           exact: false },
]

const comingSoonItems = [
  { label: 'Appointments', icon: Calendar },
  { label: 'Messages',     icon: MessageSquare },
  { label: 'Settings',     icon: Settings },
]

export default function SidebarNav({ shopName }: { shopName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-zinc-900 flex flex-col">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Scissors className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">BarberPro</span>
        </div>
        <p className="text-white font-semibold text-lg leading-tight">{shopName}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-400 text-zinc-900'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}

        <div className="pt-2 border-t border-zinc-800 mt-2 space-y-1">
          {comingSoonItems.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 cursor-not-allowed select-none"
              title="Coming soon"
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className="ml-auto text-[10px] text-zinc-600 font-normal">Soon</span>
            </div>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
