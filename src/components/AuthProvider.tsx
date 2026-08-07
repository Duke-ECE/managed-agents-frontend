import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader2, Terminal } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { authConfigured, consumeOAuthRedirect, getSession, onAuthChange } from '../lib/auth'

interface AuthState {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, loading: true })

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getSession().then((session) => {
      if (active) setState({ session, loading: false })
    })
    const unsubscribe = onAuthChange((session) => {
      if (active) setState({ session, loading: false })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // OAuth deep-link: a path stored before the GitHub redirect is consumed
  // once a session exists, sending the user where they were headed.
  useEffect(() => {
    if (!state.session) return
    const path = consumeOAuthRedirect()
    if (path) navigate(path, { replace: true })
  }, [state.session, navigate])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

/** Neutral full-screen state while the initial session check is in flight. */
export function AuthLoadingScreen() {
  return (
    <div className="app-canvas flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
    </div>
  )
}

/** Shown when Supabase env vars were not baked into the build. */
export function AuthConfigErrorScreen() {
  return (
    <div className="app-canvas flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-warn-line bg-ink-900/80 p-6 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-warn-line bg-warn-soft text-warn">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="font-display text-[17px] font-semibold text-ink-50">Authentication not configured</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
          This build is missing <code className="font-mono text-[12px] text-ink-200">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-[12px] text-ink-200">VITE_SUPABASE_ANON_KEY</code>. Set them at build time
          and redeploy.
        </p>
      </div>
    </div>
  )
}

/** Route guard: bounces unauthenticated users to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (!authConfigured) return <AuthConfigErrorScreen />
  if (loading) return <AuthLoadingScreen />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}

/** Inverse guard for /login: already-authed users go straight to the app. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (!authConfigured) return <AuthConfigErrorScreen />
  if (loading) return <AuthLoadingScreen />
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Small brand mark shared by auth screens. */
export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#7c3aed] shadow-lg shadow-accent/25">
        <Terminal className="h-4 w-4 text-white" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[15px] font-semibold tracking-tight text-ink-50">AgentDeck</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">Managed Agents</div>
      </div>
    </div>
  )
}
