import { useState } from 'react'
import { Github, Loader2 } from 'lucide-react'
import { BrandMark, RedirectIfAuthed } from '../../components/AuthProvider'
import { Button } from '../../components/ConfirmDialog'
import { Card } from '../../components/Primitives'
import { signInWithGitHub } from '../../lib/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  const signIn = async () => {
    setError(null)
    setSigningIn(true)
    try {
      // Redirects the browser to GitHub; only rejects on immediate failure.
      await signInWithGitHub()
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
            <Button className="mt-6 w-full" onClick={signIn} disabled={signingIn}>
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
              Sign in with GitHub
            </Button>
            {error && (
              <p className="mt-4 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[12px] text-bad animate-fade-in">
                {error}
              </p>
            )}
          </Card>
          <p className="mt-6 text-center text-[11px] text-ink-500">
            Access is limited to authorized users.
          </p>
        </div>
      </div>
    </RedirectIfAuthed>
  )
}
