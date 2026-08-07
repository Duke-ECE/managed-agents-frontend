import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  MessagesSquare, MessageSquare, Terminal, Sun, Moon, Loader2,
  PanelLeftOpen, PanelLeftClose, LogOut, ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../utils/format'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../components/AuthProvider'
import { signOut } from '../lib/auth'
import { fetchMe } from '../lib/chat-api'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/sessions', label: 'Sessions', icon: MessagesSquare },
]

const breadcrumbMap: Record<string, string> = {
  chat: 'Chat',
  sessions: 'Sessions',
  admin: 'LLM Access',
}

/**
 * The sidebar — docked on the left when open, tucked fully off-screen when
 * closed. One click on the top-left toggle switches between the two.
 */
function Sidebar({ open, isAdmin }: { open: boolean; isAdmin: boolean }) {
  const { session } = useAuth()
  const user = session?.user
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
  const avatarUrl = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null
  const displayName =
    (typeof metadata.user_name === 'string' && metadata.user_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    user?.email ||
    'Signed in'
  const email = user?.email ?? ''

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-60 flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#7c3aed] shadow-lg shadow-accent/25">
          <Terminal className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-semibold tracking-tight text-ink-50">AgentDeck</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">Managed Agents</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">Platform</div>
        {[...navItems, ...(isAdmin ? [{ to: '/admin', label: 'LLM Access', icon: ShieldCheck }] : [])].map(({ to, label, icon: Icon, end }: NavItem) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-ink-500/[0.10] text-ink-50'
                  : 'text-ink-400 hover:bg-ink-500/[0.07] hover:text-ink-100',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-all duration-200',
                    isActive ? 'scale-y-100 opacity-100' : 'scale-y-50 opacity-0',
                  )}
                />
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    isActive ? 'text-accent' : 'text-ink-400 group-hover:text-ink-200',
                  )}
                  strokeWidth={2}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-ink-500/[0.07]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-8 w-8 shrink-0 rounded-full border border-ink-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[12px] font-semibold text-white">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium text-ink-100">{displayName}</div>
            <div className="truncate text-[11px] text-ink-400">{email}</div>
          </div>
          <button
            onClick={() => void signOut()}
            title="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-500/[0.10] hover:text-bad"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function Header({
  theme, onToggleTheme, open, onToggleSidebar,
}: {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  open: boolean
  onToggleSidebar: () => void
}) {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const section = breadcrumbMap[segments[0] ?? ''] ?? 'Chat'
  const isDetail = segments.length > 1

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-800/70 px-4">
      {/* Sidebar toggle — the top-left "□" control */}
      <button
        onClick={onToggleSidebar}
        title={open ? 'Close sidebar' : 'Open sidebar'}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
          open
            ? 'bg-ink-500/[0.08] text-accent hover:bg-ink-500/[0.14]'
            : 'text-ink-300 hover:bg-ink-500/[0.08] hover:text-accent',
        )}
      >
        {open ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeftOpen className="h-[18px] w-[18px]" />}
      </button>

      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-display text-[15px] font-semibold tracking-tight text-ink-50">{section}</span>
        {isDetail && (
          <>
            <span className="text-ink-500">/</span>
            <span className="font-mono text-[12px] text-ink-300">{segments[1]}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 bg-ink-850 text-ink-300 transition-all duration-200 hover:border-ink-500 hover:text-amber-300"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <span className="flex items-center gap-1.5 rounded-full border border-good-line bg-good-soft px-2.5 py-1 text-[11px] font-medium text-good">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-good" />
          production
        </span>
      </div>
    </header>
  )
}

export default function DashboardLayout() {
  const [open, setOpen] = useState(true)
  const { theme, toggleTheme } = useTheme()
  // The nav item is cosmetic — the backend's /api/admin/* routes are the gate.
  // A failed /api/me (network) just hides the item.
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((me) => { if (!cancelled) setIsAdmin(me.is_admin) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="app-canvas min-h-screen">
      <Sidebar open={open} isAdmin={isAdmin} />

      {/* Foreground: the floating, rounded content panel */}
      <div className={cn('transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]', open ? 'pl-60' : 'pl-0')}>
        <div className="p-2">
          <div className="flex h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-2xl bg-panel shadow-panel">
            <Header theme={theme} onToggleTheme={toggleTheme} open={open} onToggleSidebar={() => setOpen(o => !o)} />
            <main className="relative flex-1 overflow-hidden">
              <div className="focal-glow pointer-events-none absolute inset-0" aria-hidden />
              <div className="grid-texture relative h-full overflow-y-auto px-8 py-8">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-ink-500" />
                    </div>
                  }
                >
                  <Outlet />
                </Suspense>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
