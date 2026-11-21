import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Github, Loader2 } from 'lucide-react'
import { BrandMark, RedirectIfAuthed } from '../../components/AuthProvider'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/Primitives'
import { Input } from '../../components/ui/input'
import { consumeOAuthRedirect, signInWithGitHub, signInWithGoogle, signInWithPassword } from '../../lib/auth'
import { enterLocalPreview, localPreviewEnabled } from '../../lib/local-preview'
import { CONSOLE_PATH } from '../../lib/navigation'

const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400'

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M21.35 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z" />
      <path fill="#34A853" d="M12 21.75c2.63 0 4.83-.87 6.44-2.36l-3.14-2.45c-.87.58-1.98.93-3.3.93-2.54 0-4.69-1.71-5.46-4.01H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.54 13.86A5.85 5.85 0 0 1 6.24 12c0-.65.11-1.28.3-1.86V7.61H3.3a9.75 9.75 0 0 0 0 8.78l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.46l2.79-2.79A9.36 9.36 0 0 0 12 2.25 9.75 9.75 0 0 0 3.3 7.61l3.24 2.53C7.31 7.84 9.46 6.13 12 6.13Z" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const location = useLocation()
  // Where the route guard bounced the user from (deep-link), else the console.
  const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from
  const intendedPath = from ? from.pathname + (from.search ?? '') : CONSOLE_PATH

  const signInWithEmail = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSigningIn(true)
    try {
      // Drop any stale OAuth deep-link so this login lands on the home page.
      consumeOAuthRedirect()
      await signInWithPassword(email.trim(), password)
      // Fetch the current app bundle after sign-in. A client-side route change
      // could keep an older pre-deployment logo and UI mounted until refresh.
      window.location.replace(intendedPath)
    } catch (err) {
      setSigningIn(false)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const signInWithProvider = async (provider: 'github' | 'google') => {
    setError(null)
    setSigningIn(true)
    try {
      await (provider === 'github' ? signInWithGitHub(intendedPath) : signInWithGoogle(intendedPath))
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
              {localPreviewEnabled ? 'Explore the interface with local sample data.' : 'Sign in to configure agents and connect your applications.'}
            </p>

            {localPreviewEnabled ? (
              <div className="mt-6 space-y-3">
                <Button className="w-full" onClick={() => { enterLocalPreview(); window.location.replace(intendedPath) }}>Enter local preview</Button>
                <p className="text-center text-[12px] leading-relaxed text-ink-400">
                  Sample sessions and agents only. Nothing is sent to the production API.
                </p>
              </div>
            ) : (
              <>

                <form onSubmit={signInWithEmail} className="mt-6 space-y-4">
                  <label className="block">
                    <span className={labelCls}>Email</span>
                    <Input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Password</span>
                    <Input
                      type="password"
                      required
                      autoComplete="current-password"
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
                  <p role="alert" className="mt-4 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[12px] text-bad animate-fade-in">
                    {error}
                  </p>
                )}

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-ink-700" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
                    or continue with
                  </span>
                  <span className="h-px flex-1 bg-ink-700" />
                </div>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full" onClick={() => signInWithProvider('github')} disabled={signingIn}>
                    <Github className="h-4 w-4" />
                    Sign in with GitHub
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => signInWithProvider('google')} disabled={signingIn}>
                    <GoogleMark />
                    Sign in with Google
                  </Button>
                </div>
              </>
            )}
          </Card>
          <p className="mt-6 text-center text-[11px] text-ink-500">
            {localPreviewEnabled ? 'Local preview mode · development server only' : 'Access is limited to authorized users.'}
          </p>
        </div>
      </div>
    </RedirectIfAuthed>
  )
}
