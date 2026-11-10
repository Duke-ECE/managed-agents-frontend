import { Suspense, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  MessagesSquare, MessageSquare, House, Sun, Moon, Monitor, Loader2,
  PanelLeftOpen, PanelLeftClose, LogOut, ShieldCheck, Bot, KeyRound, BookOpen, ExternalLink,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../utils/format'
import type { Theme } from '../hooks/useTheme'
import { BrandMark, useAuth } from '../components/AuthProvider'
import { signOut } from '../lib/auth'
import { fetchMe } from '../lib/chat-api'
import { localPreviewEnabled } from '../lib/local-preview'
import { NativeSelect } from '../components/ui/native-select'
import { DOCS_URL } from '../lib/navigation'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/console', label: 'Home', icon: House },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/sessions', label: 'Sessions', icon: MessagesSquare },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/keys', label: 'API Keys', icon: KeyRound },
]

const breadcrumbMap: Record<string, string> = {
  console: 'Home',
  chat: 'Chat',
  sessions: 'Sessions',
  admin: 'LLM Access',
  agents: 'Agents',
  keys: 'API Keys',
}

const SIDEBAR_WIDTH_KEY = 'managed-agents-sidebar-width'
const COMPACT_SIDEBAR_WIDTH = 56
const EXPANDED_SIDEBAR_WIDTH = 184
const SIDEBAR_SNAP_THRESHOLD = 120

function snapSidebarWidth(width: number): number {
  if (width < SIDEBAR_SNAP_THRESHOLD) return COMPACT_SIDEBAR_WIDTH
  return EXPANDED_SIDEBAR_WIDTH
}

function initialSidebarWidth(): number {
  try {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    if (Number.isFinite(stored) && stored > 0) return snapSidebarWidth(stored)
  } catch {
    // Storage can be unavailable in private browsing.
  }
  return EXPANDED_SIDEBAR_WIDTH
}

/**
 * The sidebar — docked on the left when open, tucked fully off-screen when
 * closed. One click on the top-left toggle switches between the two.
 */
function Sidebar({ open, isAdmin, width, resizing, onWidthChange, onResizeStateChange, onNavigate }: {
  open: boolean
  isAdmin: boolean
  width: number
  resizing: boolean
  onWidthChange: (width: number) => void
  onResizeStateChange: (resizing: boolean) => void
  onNavigate: () => void
}) {
  const dragStart = useRef<{ x: number; width: number } | null>(null)
  const dragMoved = useRef(false)
  const compact = width === COMPACT_SIDEBAR_WIDTH
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

  useEffect(() => {
    if (!resizing) return
    const oldCursor = document.body.style.cursor
    const oldSelection = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = oldCursor
      document.body.style.userSelect = oldSelection
    }
  }, [resizing])

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    dragStart.current = { x: event.clientX, width }
    dragMoved.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    onResizeStateChange(true)
  }

  const moveResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    if (Math.abs(event.clientX - dragStart.current.x) > 4) dragMoved.current = true
    onWidthChange(snapSidebarWidth(dragStart.current.width + event.clientX - dragStart.current.x))
  }

  const stopResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    onResizeStateChange(false)
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-ink-800 bg-canvas shadow-panel transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:w-[var(--sidebar-width)] md:border-0 md:bg-transparent md:shadow-none',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
      id="app-sidebar"
    >
      {/* Logo */}
      <Link to="/console" aria-label="PolyAgent home" className={cn('flex h-16 items-center rounded-lg px-3 transition-opacity hover:opacity-75', compact && 'md:justify-center md:px-0')}>
        <BrandMark compactOnDesktop={compact} />
      </Link>

      {/* Nav */}
      <nav className={cn('flex-1 space-y-1 overflow-y-auto px-3 py-4', compact && 'md:px-2')}>
        <div className={cn('px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500', compact && 'md:hidden')}>Platform</div>
        {[...navItems, ...(isAdmin ? [{ to: '/admin', label: 'LLM Access', icon: ShieldCheck }] : [])].map(({ to, label, icon: Icon, end }: NavItem) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={compact ? label : undefined}
            aria-label={compact ? label : undefined}
            onClick={() => { if (window.innerWidth < 768) onNavigate() }}
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                compact && 'md:mx-auto md:h-10 md:w-10 md:justify-center md:px-0',
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
                    compact && 'md:hidden',
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
                <span className={compact ? 'md:sr-only' : undefined}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <div className="my-3 border-t border-ink-800" />
        <a
          href={DOCS_URL}
          title={compact ? 'Docs' : undefined}
          aria-label={compact ? 'Docs' : undefined}
          onClick={() => { if (window.innerWidth < 768) onNavigate() }}
          className={cn(
            'group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-400 transition-colors hover:bg-ink-500/[0.07] hover:text-ink-100',
            compact && 'md:mx-auto md:h-10 md:w-10 md:justify-center md:px-0',
          )}
        >
          <BookOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          <span className={compact ? 'md:sr-only' : undefined}>Docs</span>
          <ExternalLink className={cn('ml-auto h-3.5 w-3.5 text-ink-500', compact && 'md:hidden')} aria-hidden />
        </a>
      </nav>

      {/* Bottom */}
      <div className={cn('px-3 py-3', compact && 'md:px-1')}>
        <div className={cn('mb-2 flex items-center gap-2 px-3 text-[11px] text-ink-500', compact && 'md:justify-center md:px-0')} title={localPreviewEnabled ? 'Local preview' : 'Production'}>
          <span className="h-1.5 w-1.5 rounded-full bg-accent-fg" aria-hidden />
          <span className={compact ? 'md:sr-only' : undefined}>{localPreviewEnabled ? 'Local preview' : 'Production'}</span>
        </div>
        <div className={cn('flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-ink-500/[0.07]', compact && 'md:flex-col md:px-0')}>
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
          <div className={cn('min-w-0 flex-1 leading-tight', compact && 'md:hidden')}>
            <div className="truncate text-[13px] font-medium text-ink-100">{displayName}</div>
            <div className="truncate text-[11px] text-ink-400">{email}</div>
          </div>
          <button
            onClick={() => void signOut()}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-500/[0.10] hover:text-bad"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open && (
        <div
          role="separator"
          aria-label="Resize or toggle sidebar"
          aria-controls="app-sidebar"
          aria-orientation="vertical"
          aria-valuemin={COMPACT_SIDEBAR_WIDTH}
          aria-valuemax={EXPANDED_SIDEBAR_WIDTH}
          aria-valuenow={width}
          aria-valuetext={compact ? 'Compact' : 'Expanded'}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
          onClick={(event) => {
            if (dragMoved.current || event.detail > 1) return
            onWidthChange(compact ? EXPANDED_SIDEBAR_WIDTH : COMPACT_SIDEBAR_WIDTH)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onWidthChange(compact ? EXPANDED_SIDEBAR_WIDTH : COMPACT_SIDEBAR_WIDTH)
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              onWidthChange(event.key === 'ArrowLeft' ? COMPACT_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH)
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault()
              onWidthChange(event.key === 'Home' ? COMPACT_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH)
            }
          }}
          className={cn(
            'sidebar-resize-handle group absolute inset-y-0 right-0 z-10 hidden w-2 translate-x-1/2 cursor-col-resize touch-none items-center justify-center md:flex',
            resizing && 'bg-accent/10',
          )}
          title={compact ? 'Click or drag to expand' : 'Click or drag to collapse'}
        >
          <span className={cn('h-6 w-0.5 rounded-full bg-ink-700/70 transition-colors group-hover:bg-accent group-focus-visible:bg-accent', resizing && 'bg-accent')} />
        </div>
      )}
    </aside>
  )
}

function Header({
  theme, onSelectTheme, open, onToggleSidebar,
}: {
  theme: Theme
  onSelectTheme: (theme: Theme) => void
  open: boolean
  onToggleSidebar: () => void
}) {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const section = breadcrumbMap[segments[0] ?? ''] ?? 'Chat'
  const isDetail = segments.length > 1

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-800/70 px-4 sm:px-6">
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

      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="font-display text-[15px] font-semibold tracking-tight text-ink-50">{section}</span>
        {isDetail && (
          <>
            <span className="text-ink-500">/</span>
            <span className="truncate font-mono text-[12px] text-ink-300">{segments[1]}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-850 px-2.5 text-ink-300 transition-colors hover:border-ink-500">
          {theme === 'system' ? <Monitor className="h-4 w-4" aria-hidden /> : theme === 'dark' ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
          <NativeSelect
            aria-label="Theme"
            value={theme}
            onChange={(event) => onSelectTheme(event.target.value as Theme)}
            className="h-full border-0 bg-transparent px-0 font-medium text-ink-200"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </NativeSelect>
        </div>

      </div>
    </header>
  )
}

export default function DashboardLayout({ theme, onSelectTheme }: { theme: Theme; onSelectTheme: (theme: Theme) => void }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth)
  const [resizing, setResizing] = useState(false)
  // The nav item is cosmetic — the backend's /api/admin/* routes are the gate.
  // A failed /api/me (network) just hides the item.
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)) } catch { /* ignore */ }
  }, [sidebarWidth])

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((me) => { if (!cancelled) setIsAdmin(me.is_admin) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="app-canvas min-h-screen" style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}
      <Sidebar open={open} isAdmin={isAdmin} width={sidebarWidth} resizing={resizing} onWidthChange={setSidebarWidth} onResizeStateChange={setResizing} onNavigate={() => setOpen(false)} />

      {/* Foreground: the floating, rounded content panel */}
      <div className={cn(resizing ? 'transition-none' : 'transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]', open ? 'md:pl-[var(--sidebar-width)]' : 'pl-0')}>
        <div className="md:p-1">
          <div className="flex h-dvh flex-col overflow-hidden bg-panel shadow-panel md:h-[calc(100dvh-0.5rem)] md:rounded-2xl">
            <Header theme={theme} onSelectTheme={onSelectTheme} open={open} onToggleSidebar={() => setOpen(o => !o)} />
            <main className="relative flex-1 overflow-hidden">
              <div className="relative h-full overflow-y-auto bg-panel px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
