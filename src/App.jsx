import { useEffect, useState } from 'react'
import './App.css'
import AgentChat from './AgentChat.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'https://api-managed-agent.colab.duke.edu'

const surfaces = [
  {
    index: '01',
    label: 'Frontend',
    title: 'A clear entry point',
    description: 'A React interface for understanding the platform and seeing the system at a glance.',
    href: 'https://managed-agents.colab.duke.edu',
    linkLabel: 'Open frontend',
  },
  {
    index: '02',
    label: 'API',
    title: 'A service agents can reach',
    description: 'An Express backend exposed through the cluster ingress and ready for agent workflows.',
    href: `${API_URL}/api/message`,
    linkLabel: 'Check endpoint',
  },
  {
    index: '03',
    label: 'Docs',
    title: 'One source of truth',
    description: 'Architecture, setup notes, and team conventions collected in a searchable VitePress site.',
    href: 'https://duke-ece.github.io/managed-agents-docs/',
    linkLabel: 'Read the docs',
  },
]

const nodes = ['node-01', 'node-02', 'node-03', 'node-04']

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>
}

function App() {
  const [apiState, setApiState] = useState({
    status: 'loading',
    message: 'Contacting the backend…',
    servedBy: '',
  })

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${API_URL}/api/message`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => {
        setApiState({
          status: 'ok',
          message: data.message || 'Backend connected',
          servedBy: data.servedBy || '',
        })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setApiState({ status: 'error', message: 'Backend is temporarily unreachable', servedBy: '' })
      })

    return () => controller.abort()
  }, [])

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Managed Agents home">
          <span className="brand-mark" aria-hidden="true">MA</span>
          <span>Managed Agents</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#platform">Platform</a>
          <a href="#chat">Chat</a>
          <a href="#delivery">Delivery</a>
          <a href="https://duke-ece.github.io/managed-agents-docs/" target="_blank" rel="noreferrer">
            Docs <ArrowIcon />
          </a>
        </nav>
        <span className="team-chip">Duke ECE</span>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" />Four-node Kubernetes cluster</p>
            <h1>Ship agents.<span>Manage the system behind them.</span></h1>
            <p className="hero-summary">
              Managed Agents is a compact, production-minded platform for building, deploying, and documenting agent services across Duke ECE infrastructure.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="https://duke-ece.github.io/managed-agents-docs/" target="_blank" rel="noreferrer">
                Explore the docs <ArrowIcon />
              </a>
              <a className="button button-secondary" href="https://github.com/Duke-ECE" target="_blank" rel="noreferrer">View on GitHub</a>
            </div>

            <div className={`api-status api-status--${apiState.status}`} role="status" aria-live="polite">
              <span className="status-light" aria-hidden="true" />
              <span className="status-copy">
                <strong>{apiState.status === 'ok' ? 'API connected' : apiState.status === 'loading' ? 'Checking API' : 'API unavailable'}</strong>
                <span>{apiState.message}</span>
              </span>
              {apiState.servedBy && <code title="Serving backend instance">{apiState.servedBy}</code>}
            </div>
          </div>

          <div className="system-panel" aria-label="Managed Agents cluster overview">
            <div className="panel-topline">
              <span>Live system</span>
              <span className="live-label"><i aria-hidden="true" />online</span>
            </div>
            <div className="route-card">
              <div>
                <span className="route-kicker">Public ingress</span>
                <strong>managed-agents.colab.duke.edu</strong>
              </div>
              <span className="route-badge">HTTP</span>
            </div>
            <div className="flow-line" aria-hidden="true"><span /><span /></div>
            <div className="service-grid">
              <article className="service-card">
                <div className="service-icon" aria-hidden="true">R</div>
                <div><span>Interface</span><strong>React frontend</strong></div>
                <span className="service-port">:80</span>
              </article>
              <article className="service-card service-card--api">
                <div className="service-icon" aria-hidden="true">E</div>
                <div><span>Service</span><strong>Express API</strong></div>
                <span className="service-port">/api</span>
              </article>
            </div>
            <div className="node-region">
              <div className="node-title"><span>Compute pool</span><span>4 / 4 healthy</span></div>
              <div className="node-grid">
                {nodes.map((node, index) => (
                  <div className="node" key={node}>
                    <span className="node-number">0{index + 1}</span><span>{node}</span><i aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="metrics section-wrap" aria-label="Platform summary">
          <div><strong>04</strong><span>Kubernetes nodes</span></div>
          <div><strong>03</strong><span>Team surfaces</span></div>
          <div><strong>01</strong><span>Shared platform</span></div>
          <div><strong>24/7</strong><span>Automated delivery</span></div>
        </section>

        <section className="platform-section section-wrap" id="platform">
          <div className="section-heading">
            <p className="eyebrow">The platform</p>
            <h2>Three surfaces. One system.</h2>
            <p>Everything the team needs to understand, test, and extend the Managed Agents stack.</p>
          </div>
          <div className="surface-grid">
            {surfaces.map((surface) => (
              <article className="surface-card" key={surface.label}>
                <div className="surface-meta"><span>{surface.index}</span><span>{surface.label}</span></div>
                <h3>{surface.title}</h3>
                <p>{surface.description}</p>
                <a href={surface.href} target="_blank" rel="noreferrer">{surface.linkLabel} <ArrowIcon /></a>
              </article>
            ))}
          </div>
        </section>

        <section className="chat-section section-wrap" id="chat">
          <div className="section-heading">
            <p className="eyebrow">Try it</p>
            <h2>Chat with the backend.</h2>
            <p>
              Bring your own OpenAI-compatible credentials — a session is created on
              your first message and replies stream back live.
            </p>
          </div>
          <AgentChat />
        </section>

        <section className="delivery-section section-wrap" id="delivery">
          <div className="delivery-copy">
            <p className="eyebrow">Continuous delivery</p>
            <h2>From commit to cluster, without the ceremony.</h2>
            <p>Each repository owns its build pipeline. A push to main produces a container, publishes it, and rolls the service forward on the cluster.</p>
          </div>
          <ol className="pipeline" aria-label="Deployment pipeline">
            <li><span>01</span><div><strong>Commit</strong><p>Merge a focused change to main.</p></div></li>
            <li><span>02</span><div><strong>Build</strong><p>GitHub Actions verifies and packages it.</p></div></li>
            <li><span>03</span><div><strong>Publish</strong><p>The new image lands in GHCR.</p></div></li>
            <li><span>04</span><div><strong>Deploy</strong><p>Kubernetes rolls out the release.</p></div></li>
          </ol>
        </section>

        <section className="cta-section section-wrap">
          <div><p className="eyebrow">Ready to contribute?</p><h2>Start with the architecture. Stay for the agents.</h2></div>
          <a className="button button-primary" href="https://duke-ece.github.io/managed-agents-docs/" target="_blank" rel="noreferrer">Get started <ArrowIcon /></a>
        </section>
      </main>

      <footer className="footer section-wrap">
        <span>Managed Agents · Duke ECE</span><span>Built for small teams with serious systems.</span>
      </footer>
    </div>
  )
}

export default App
