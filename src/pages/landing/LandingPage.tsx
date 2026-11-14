import { useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AppWindow, ArrowRight, BookOpen, Bot, Check, Code2, Database, KeyRound, Network, Radio, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import { API_GUIDE_URL, CONSOLE_PATH, DOCS_URL } from '../../lib/navigation'
import './landing.css'

const features = [
  {
    icon: Bot,
    title: 'Configure hosted agents',
    description: 'Define reusable agents with their own instructions and model configuration.',
  },
  {
    icon: Radio,
    title: 'Stream conversations',
    description: 'Your server calls the chat API and receives replies as a live event stream.',
  },
  {
    icon: Database,
    title: 'Keep session history',
    description: 'Sessions and transcripts remain available so your app can resume a conversation later.',
  },
]


function ProductPreview() {
  return (
    <div className="landing-preview" role="img" aria-label="Illustration of an application connecting to a hosted agent through the PolyAgent API">
      <div className="landing-preview-bar">
        <span className="landing-preview-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>PolyAgent / Integration</span>
        <span className="landing-preview-live"><span /> Connected</span>
      </div>
      <div className="landing-preview-body">
        <aside className="landing-preview-side" aria-hidden="true">
          <div className="landing-preview-side-title">CONSOLE</div>
          <div className="landing-preview-side-item active"><Bot size={13} /> Agents</div>
          <div className="landing-preview-side-item"><KeyRound size={13} /> API Keys</div>
          <div className="landing-preview-side-item"><Database size={13} /> Sessions</div>
          <div className="landing-preview-side-title history">AGENT</div>
          <div className="landing-preview-history">Support assistant</div>
          <div className="landing-preview-history">Model + instructions</div>
        </aside>
        <div className="landing-preview-integration">
          <div className="landing-preview-integration-header">
            <span>One agent, available to your application</span>
            <span className="landing-preview-api-label">SERVER-SIDE API</span>
          </div>
          <div className="landing-preview-integration-content">
            <div className="landing-preview-flow">
              <div className="landing-preview-node"><AppWindow size={20} /><strong>Your app</strong><span>Owns the experience</span></div>
              <ArrowRight className="landing-preview-flow-arrow" size={16} />
              <div className="landing-preview-node"><KeyRound size={20} /><strong>Managed API</strong><span>Authenticated calls</span></div>
              <ArrowRight className="landing-preview-flow-arrow" size={16} />
              <div className="landing-preview-node"><Bot size={20} /><strong>Hosted agent</strong><span>Runs the conversation</span></div>
            </div>
            <div className="landing-preview-request">
              <div><span>POST</span> /api/sessions/:id/messages</div>
              <code>Authorization: Bearer YOUR_API_KEY</code>
              <code>{'{ "content": "Help this user plan a trip" }'}</code>
            </div>
            <div className="landing-preview-result"><Radio size={14} /> Streamed reply <span>·</span> <Database size={14} /> Saved session</div>
          </div>
        </div>
      </div>
      <div className="landing-preview-caption"><Check size={13} /> Configure in the console · Connect from your server</div>
    </div>
  )
}

type MarketingPage = 'home' | 'how-it-works' | 'capabilities' | 'docs'

const docsLinks = [
  { icon: BookOpen, title: 'Documentation home', description: 'Start with the product overview and find your way through the guides.', href: DOCS_URL },
  { icon: Code2, title: 'API guide', description: 'Create an API key, start a session, and stream an agent response.', href: API_GUIDE_URL },
  { icon: Network, title: 'Architecture', description: 'See how the frontend, backend, runtime, and session service connect.', href: `${DOCS_URL}architecture` },
]

export default function LandingPage({ page }: { page: MarketingPage }) {
  const { session } = useAuth()
  const destination = CONSOLE_PATH

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = page === 'home' ? 'PolyAgent' : `${page === 'how-it-works' ? 'How it works' : page === 'capabilities' ? 'Capabilities' : 'Docs'} · PolyAgent`
  }, [page])

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="PolyAgent home">
          <img src="/favicon.svg" alt="" />
          <span>PolyAgent</span>
        </Link>
        <nav aria-label="Main navigation" className="landing-nav">
          <NavLink to="/how-it-works">How it works</NavLink>
          <NavLink to="/capabilities">Capabilities</NavLink>
          <NavLink to="/docs">Docs</NavLink>
        </nav>
        <div className="landing-header-actions">
          <Link className="landing-login" to={session ? destination : '/login'}>
            {session ? 'Open console' : 'Log in'} <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <main>
        {page === 'home' && (
          <section className="landing-hero">
            <div className="landing-hero-copy">
              <h1>Hosted agents<br /><span>for your apps.</span></h1>
              <p>PolyAgent gives other applications a place to run agents. Configure them in one console, connect from your server with an API key, and keep conversations available across sessions.</p>
              <div className="landing-actions">
                <Link className="landing-primary" to={destination}>Open the console <ArrowRight size={17} /></Link>
                <a className="landing-secondary" href={API_GUIDE_URL}>Explore the API <ArrowRight size={15} /></a>
              </div>
              <div className="landing-hero-foot"><ShieldCheck size={15} /> Keep API keys on your server, away from browser code</div>
            </div>
            <div className="landing-hero-visual"><ProductPreview /></div>
          </section>
        )}

        {page === 'how-it-works' && <section className="landing-subpage" aria-labelledby="landing-how-title">
          <div className="landing-subpage-intro">
            <h1 id="landing-how-title">Connect your application to an agent.</h1>
            <p>Configure an agent once, then let your server create conversations and stream responses through the PolyAgent API.</p>
          </div>
          <div className="landing-flow">
            <div className="landing-flow-grid">
              <div><span>01 / CONFIGURE</span><h2>Define the agent</h2><p>Set its instructions and model in the console, then use its agent ID in your app.</p></div>
              <div><span>02 / CONNECT</span><h2>Call the API</h2><p>Create an API key for your server. Start a session and send messages through authenticated endpoints.</p></div>
              <div><span>03 / RESPOND</span><h2>Stream and resume</h2><p>Display replies as they arrive and use the saved session ID to continue later.</p></div>
            </div>
          </div>
          <div className="landing-note"><ShieldCheck size={19} /><p>Call the API from your server so your API key stays out of browser code. <a href={API_GUIDE_URL}>Follow the API guide <ArrowRight size={14} /></a></p></div>
        </section>}

        {page === 'capabilities' && <section className="landing-subpage" aria-labelledby="landing-capabilities-title">
          <div className="landing-subpage-intro">
            <h1 id="landing-capabilities-title">Agent infrastructure your app can use.</h1>
            <p>Give your application a reusable agent and a conversation API, with sessions you can return to later.</p>
          </div>
          <div className="landing-features">
            <div className="landing-feature-grid">
              {features.map(({ icon: Icon, title, description }) => (
                <article className="landing-feature" key={title}>
                  <div className="landing-feature-icon"><Icon size={21} strokeWidth={1.7} /></div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
          <Link className="landing-text-link" to="/how-it-works">See how it works <ArrowRight size={16} /></Link>
        </section>}

        {page === 'docs' && <section className="landing-subpage" aria-labelledby="landing-docs-title">
          <div className="landing-subpage-intro">
            <h1 id="landing-docs-title">Build with PolyAgent.</h1>
            <p>Find the guides and reference material for connecting your application, understanding the platform, and working with its API.</p>
          </div>
          <div className="landing-docs-grid">
            {docsLinks.map(({ icon: Icon, title, description, href }) => (
              <a className="landing-doc-card" href={href} key={title} aria-label={title}>
                <Icon size={22} strokeWidth={1.7} />
                <div><h2>{title}</h2><p>{description}</p></div>
                <ArrowRight size={18} />
              </a>
            ))}
          </div>
        </section>}

        <section className="landing-end">
          <h2>Give your application an agent.</h2>
          <div className="landing-end-actions">
            <Link className="landing-primary" to={destination}>Open the console <ArrowRight size={17} /></Link>
            <Link className="landing-secondary" to="/docs">Read the docs <ArrowRight size={15} /></Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer"><span>PolyAgent</span><Link to="/docs">Docs <ArrowRight size={13} /></Link></footer>
    </div>
  )
}
