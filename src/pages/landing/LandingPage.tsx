import { Link } from 'react-router-dom'
import { AppWindow, ArrowRight, Bot, Check, Database, KeyRound, Radio, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import './landing.css'

const features = [
  {
    number: '01',
    icon: Bot,
    title: 'Configure hosted agents',
    description: 'Define reusable agents with their own instructions and model configuration.',
  },
  {
    number: '02',
    icon: Radio,
    title: 'Stream conversations',
    description: 'Your server calls the chat API and receives replies as a live event stream.',
  },
  {
    number: '03',
    icon: Database,
    title: 'Keep session history',
    description: 'Sessions and transcripts remain available so your app can resume a conversation later.',
  },
]

function ProductPreview() {
  return (
    <div className="landing-preview" role="img" aria-label="Illustration of an application connecting to a hosted agent through the Managed Agents API">
      <div className="landing-preview-bar">
        <span className="landing-preview-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>Managed Agents / Integration</span>
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

export default function LandingPage() {
  const { session } = useAuth()
  const destination = '/agents'

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Managed Agents home">
          <img src="/favicon.svg" alt="" />
          <span>Managed Agents</span>
        </Link>
        <nav aria-label="Main navigation" className="landing-nav">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Capabilities</a>
          <Link to="/keys?tab=docs">API guide</Link>
        </nav>
        <Link className="landing-login" to={session ? destination : '/login'}>
          {session ? 'Open console' : 'Log in'} <ArrowRight size={15} />
        </Link>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span /> AGENT HOSTING FOR APPLICATIONS</div>
            <h1>Hosted agents<br /><span>for your apps.</span></h1>
            <p>Managed Agents gives other applications a place to run agents. Configure them in one console, connect from your server with an API key, and keep conversations available across sessions.</p>
            <div className="landing-actions">
              <Link className="landing-primary" to={destination}>Open the console <ArrowRight size={17} /></Link>
              <Link className="landing-secondary" to="/keys?tab=docs">Explore the API <ArrowRight size={15} /></Link>
            </div>
            <div className="landing-hero-foot"><ShieldCheck size={15} /> Keep API keys on your server, away from browser code</div>
          </div>
          <div className="landing-hero-visual"><ProductPreview /></div>
        </section>

        <section className="landing-flow" id="how-it-works" aria-labelledby="landing-flow-title">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">HOW IT WORKS</span>
            <h2 id="landing-flow-title">Connect your application to an agent.</h2>
          </div>
          <div className="landing-flow-grid">
            <div><span>01 / CONFIGURE</span><h3>Define the agent</h3><p>Set its instructions and model in the console, then use its agent ID in your app.</p></div>
            <div><span>02 / CONNECT</span><h3>Call the API</h3><p>Create an API key for your server. Start a session and send messages through authenticated endpoints.</p></div>
            <div><span>03 / RESPOND</span><h3>Stream and resume</h3><p>Display replies as they arrive and use the saved session ID to continue later.</p></div>
          </div>
        </section>

        <section className="landing-features" id="features" aria-labelledby="landing-features-title">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">THE PLATFORM</span>
            <h2 id="landing-features-title">Agent infrastructure your app can use.</h2>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ number, icon: Icon, title, description }) => (
              <article className="landing-feature" key={number}>
                <div className="landing-feature-top"><Icon size={20} strokeWidth={1.7} /><span>{number}</span></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-end">
          <span className="landing-section-kicker">READY WHEN YOU ARE</span>
          <h2>Give your application an agent.</h2>
          <Link className="landing-primary" to={destination}>Open the console <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="landing-footer"><span>Managed Agents · Duke ECE</span><Link to="/keys?tab=docs">API guide <ArrowRight size={13} /></Link></footer>
    </div>
  )
}
