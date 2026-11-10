import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import { DOCS_URL } from '../../lib/navigation'

export default function NotFoundPage() {
  return <main className="app-canvas flex min-h-screen items-center justify-center p-6">
    <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-8 text-center shadow-card">
      <Link to="/" aria-label="PolyAgent home" className="inline-flex items-center gap-2.5 text-ink-50 hover:opacity-80">
        <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
        <span className="font-display text-[15px] font-semibold">PolyAgent</span>
      </Link>
      <p className="mt-8 font-mono text-[12px] tracking-widest text-accent">404</p>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-ink-50">Page not found</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-300">This address may have changed. Start from the homepage or find the guide in Docs.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[13px] font-medium text-white hover:bg-accent-hover">Homepage <ArrowRight className="h-4 w-4" /></Link>
        <a href={DOCS_URL} className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-600 px-4 text-[13px] font-medium text-ink-200 hover:bg-ink-850"><BookOpen className="h-4 w-4" /> Docs</a>
      </div>
    </div>
  </main>
}
