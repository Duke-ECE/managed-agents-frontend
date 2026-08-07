import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Github, Loader2 } from 'lucide-react'
import { BrandMark, RedirectIfAuthed } from '../../components/AuthProvider'
import { Button } from '../../components/ConfirmDialog'
import { Card } from '../../components/Primitives'
import { consumeOAuthRedirect, signInWithGitHub, signInWithPassword } from '../../lib/auth'

const inputCls =
  'h-9 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 text-[13px] text-ink-100 placeholder:text-ink-500 transition-colors focus:border-accent focus:outline-none'

const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const location = useLocation()
  // Where the route guard bounced the user from (deep-link), else the chat.
  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from
  const intendedPath = from ? from.pathname + (from.search ?? '') : '/chat'

  const signInWithEmail = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSigningIn(true)
    try {
      // Drop any stale OAuth deep-link so this login lands on the home page.
      consumeOAuthRedirect()
      // On success the AuthProvider session listener routes the user in.
      await signInWithPassword(email.trim(), password)
    } catch (err) {
      setSigningIn(false)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const signInWithOAuth = async () => {
    setError(null)
    setSigningIn(true)
    try {
      // Redirects the browser to GitHub; only rejects on immediate failure
      // (e.g. the provider is not configured in Supabase yet).
      await signInWithGitHub(intendedPath)
    } catch (err) {
      setSigningIn(false)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <RedirectIfAuthed>
      <div className="app-canvas relative flex min-h-screen items-center justify-center p-4">
        <div className="focal-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="grid-texture relative flex w-full max-w-sm flex-col items-center">
          <Card className="w-full p-8 animate-fade-up">
            <div className="flex justify-center">
              <BrandMark />
            </div>
            <p className="mt-5 text-center text-[13px] leading-relaxed text-ink-400">
              Sign in to manage your sandboxes, agents, and sessions.
            </p>

            <form onSubmit={signInWithEmail} className="mt-6 space-y-4">
              <label className="block">
                <span className={labelCls}>Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className={labelCls}>Password</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <Button type="submit" className="w-full" disabled={signingIn}>
                {signingIn && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>

            {error && (
              <p className="mt-4 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[12px] text-bad animate-fade-in">
                {error}
              </p>
            )}

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink-700" />
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
                or continue with GitHub
              </span>
              <span className="h-px flex-1 bg-ink-700" />
            </div>

            <Button variant="outline" className="w-full" onClick={signInWithOAuth} disabled={signingIn}>
              <Github className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          </Card>
          <p className="mt-6 text-center text-[11px] text-ink-500">
            Access is limited to authorized users.
          </p>
        </div>
      </div>
    </RedirectIfAuthed>
  )
}
