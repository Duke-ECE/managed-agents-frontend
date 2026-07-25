/**
 * Supabase auth — GitHub OAuth. The client is created from build-time env
 * vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). When they are missing
 * the app must not crash: `authConfigured` is false, every helper becomes a
 * no-op, and the UI renders a config error state instead.
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

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

export async function signInWithGitHub(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * Clear the local session without a network call. Used when the backend
 * answers 401 — the onAuthChange listener then drops the session and the
 * route guard bounces the user back to /login.
 */
export async function handleUnauthorized(): Promise<void> {
  if (!supabase) return
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
