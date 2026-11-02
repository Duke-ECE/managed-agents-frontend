import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Check, ChevronDown, KeyRound, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import './landing.css'

const features = [
  {
    number: '01',
    icon: Bot,
    title: 'Make the agent yours',
    description: 'Choose a reusable agent template with its own instructions and model configuration.',
  },
  {
    number: '02',
    icon: MessageSquare,
    title: 'Stay in the conversation',
    description: 'See responses as they arrive. Return to saved sessions and pick up where you left off.',
  },
  {
    number: '03',
    icon: KeyRound,
    title: 'Connect your own app',
    description: 'Create a server-side API key for access to your existing agents and sessions. Revoke it when you need to.',
  },
]

function ProductPreview() {
  return (
    <div className="landing-preview" role="img" aria-label="Illustration of an agent chat and saved sessions in the Managed Agents console">
      <div className="landing-preview-bar">
        <span className="landing-preview-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>Managed Agents / Chat</span>
        <span className="landing-preview-live"><span /> Connected</span>
      </div>
      <div className="landing-preview-body">
        <aside className="landing-preview-side" aria-hidden="true">
          <div className="landing-preview-side-title">WORKSPACE</div>
          <div className="landing-preview-side-item active"><MessageSquare size={13} /> Chat</div>
          <div className="landing-preview-side-item"><Bot size={13} /> Agents</div>
          <div className="landing-preview-side-item"><KeyRound size={13} /> API Keys</div>
          <div className="landing-preview-side-title history">RECENT SESSIONS</div>
          <div className="landing-preview-history">Release notes summary</div>
          <div className="landing-preview-history">Planning the next sprint</div>
        </aside>
        <div className="landing-preview-chat">
          <div className="landing-preview-chat-header">
            <span><span className="landing-preview-agent-icon"><Sparkles size={12} /></span> Default assistant</span>
            <ChevronDown size={14} />
          </div>
          <div className="landing-preview-messages">
            <div className="landing-preview-user">Help me turn these notes into a short project update.</div>
            <div className="landing-preview-response">
              <span className="landing-preview-response-icon"><Sparkles size={14} /></span>
              <div>
                <strong>Project update</strong>
                <p>The team completed the first phase of the release and is validating the remaining integration work.</p>
                <p>Next: review the open issues, confirm owners, and share the rollout plan.</p>
              </div>
            </div>
          </div>
          <div className="landing-preview-compose">Message your agent <ArrowRight size={14} /></div>
        </div>
      </div>
      <div className="landing-preview-caption"><Check size={13} /> Sessions are saved so you can return later</div>
    </div>
  )
}

export default function LandingPage() {
  const { session } = useAuth()
  const destination = session ? '/chat' : '/login'

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Managed Agents home">
          <img src="/favicon.svg" alt="" />
          <span>Managed Agents</span>
        </Link>
        <nav aria-label="Main navigation" className="landing-nav">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="https://duke-ece.github.io/managed-agents-docs/">Docs</a>
        </nav>
        <Link className="landing-login" to={destination}>
          {session ? 'Open console' : 'Log in'} <ArrowRight size={15} />
        </Link>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span /> A place for your agents and their conversations</div>
            <h1>Build the agent.<br /><span>Keep the context.</span></h1>
            <p>Configure an agent, work with it in real time, and return to the conversation whenever you need it. One console for the chat and the controls behind it.</p>
            <div className="landing-actions">
              <Link className="landing-primary" to={destination}>Open the console <ArrowRight size={17} /></Link>
              <a className="landing-secondary" href="#how-it-works">See how it works <ArrowRight size={15} /></a>
            </div>
            <div className="landing-hero-foot"><ShieldCheck size={15} /> Your sessions stay connected to your account</div>
          </div>
          <div className="landing-hero-visual"><ProductPreview /></div>
        </section>

        <section className="landing-flow" id="how-it-works" aria-labelledby="landing-flow-title">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">HOW IT WORKS</span>
            <h2 id="landing-flow-title">From a first prompt to a lasting workspace.</h2>
          </div>
          <div className="landing-flow-grid">
            <div><span>01 / CONFIGURE</span><h3>Choose an agent</h3><p>Start with a shared template or create one with the instructions and model you need.</p></div>
            <div><span>02 / CONVERSE</span><h3>Work in real time</h3><p>Responses stream into the chat while the conversation remains easy to follow.</p></div>
            <div><span>03 / CONTINUE</span><h3>Come back later</h3><p>Find the session in your history and continue with its saved context.</p></div>
          </div>
        </section>

        <section className="landing-features" id="features" aria-labelledby="landing-features-title">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">THE PLATFORM</span>
            <h2 id="landing-features-title">The useful parts of an agent, together.</h2>
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
          <h2>Pick up where you left off.</h2>
          <Link className="landing-primary" to={destination}>Go to Managed Agents <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="landing-footer"><span>Managed Agents · Duke ECE</span><a href="https://duke-ece.github.io/managed-agents-docs/">Documentation <ArrowRight size={13} /></a></footer>
    </div>
  )
}
