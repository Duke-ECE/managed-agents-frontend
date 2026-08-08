/**
 * Supabase auth — GitHub OAuth. The client is created from build-time env
 * vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). When they are missing
 * the app must not crash: `authConfigured` is false, every helper becomes a
 * no-op, and the UI renders a config error state instead.
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { clearTranscriptStorage } from '../pages/chat/transcript-cache'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase: SupabaseClient | null = authConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
  : null

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

const OAUTH_REDIRECT_KEY = 'managed-agents.oauth-redirect'

export async function signInWithGitHub(redirectPath = '/chat'): Promise<void> {
  if (!supabase) return
  // The OAuth round-trip drops the SPA's router state, so the intended
  // destination survives in sessionStorage; AuthProvider consumes it once a
  // session appears. It is also encoded in redirectTo so an allow-listed
  // Supabase setup lands on the page directly.
  sessionStorage.setItem(OAUTH_REDIRECT_KEY, redirectPath)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + redirectPath },
  })
  if (error) {
    sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
    throw error
  }
}

/** Read and clear the path stored before the OAuth redirect, if any. */
export function consumeOAuthRedirect(): string | null {
  const path = sessionStorage.getItem(OAUTH_REDIRECT_KEY)
  if (path) sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
  return path
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Authentication is not configured')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  // Drop persisted transcript cache so the next account on this browser
  // never sees the previous user's conversations.
  clearTranscriptStorage()
  await supabase.auth.signOut()
}

/**
 * Clear the local session without a network call. Used when the backend
 * answers 401 — the onAuthChange listener then drops the session and the
 * route guard bounces the user back to /login.
 */
export async function handleUnauthorized(): Promise<void> {
  if (!supabase) return
  clearTranscriptStorage()
  await supabase.auth.signOut({ scope: 'local' })
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}
