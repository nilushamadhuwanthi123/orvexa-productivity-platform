import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Activity,
  KanbanSquare,
  Radio,
  ShieldCheck,
  Gauge,
  Layers,
  Check,
} from 'lucide-react';
import ThemeControls from '../components/ThemeControls.jsx';
import './Landing.css';

const FEATURES = [
  {
    icon: Gauge,
    title: 'Progress you can actually see',
    body: 'Every KPI, streak and health score is computed from your task data by MongoDB aggregation at read time — so the number on the card is the number in the database.',
  },
  {
    icon: KanbanSquare,
    title: 'A board that keeps its place',
    body: 'Drag a card and the new column and position persist. Reload, switch device, hand over to a teammate — the board looks the same.',
  },
  {
    icon: Radio,
    title: 'Live, without refreshing',
    body: 'Socket.IO rooms per project and per task. Assignments, moves, comments and mentions land on every open screen the moment they happen.',
  },
  {
    icon: Activity,
    title: 'Health with a reason attached',
    body: '"At risk because 7 tasks are overdue." Never a colour without an explanation, never a score you cannot trace back to real work.',
  },
  {
    icon: ShieldCheck,
    title: 'Permissions enforced server-side',
    body: 'Three roles plus per-project membership, checked on every request. Hiding a button is not access control, so we do both.',
  },
  {
    icon: Layers,
    title: 'One design system throughout',
    body: 'Forest and Champagne carry the interface; separate palettes carry the charts. Light and dark are tuned independently, not inverted.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create your workspace',
    body: 'Sign up, pick a role and spin up your first project in under a minute. The first account becomes the workspace admin.',
  },
  {
    n: '02',
    title: 'Plan the work',
    body: 'Projects, milestones, dependencies and estimates. Break work down on a board that mirrors how your team actually moves.',
  },
  {
    n: '03',
    title: 'Watch progress compound',
    body: 'As tasks complete, the dashboard, streaks, goals and project health update themselves. No status meeting required.',
  },
];

const PROOF = [
  {
    quote:
      'The health score is the first one I have trusted, because it tells me exactly which overdue tasks caused it. I stopped asking for status updates in week two.',
    name: 'Engineering Manager',
    detail: 'Platform team, 14 people',
  },
  {
    quote:
      'Drag a card, close the laptop, open it on the train — the board is exactly where I left it. That sounds small until you have used tools where it is not true.',
    name: 'Frontend Engineer',
    detail: 'Design system squad',
  },
  {
    quote:
      'Our weekly review went from an hour of spreadsheet wrangling to opening one page. The numbers were already right.',
    name: 'Product Manager',
    detail: 'Insights & analytics',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing__nav">
        <Link to="/" className="landing__brand">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--primary-soft-2)" />
            <path
              d="M8 21.5 13.2 10.5h2.3l5.2 11h-2.5l-1.05-2.4h-5.6L10.5 21.5H8Zm4.4-4.3h4l-2-4.6-2 4.6Z"
              fill="var(--primary)"
            />
            <circle cx="23" cy="11" r="2.4" fill="var(--accent)" />
          </svg>
          <span>Orvexa</span>
        </Link>

        <nav className="landing__links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#proof">Teams</a>
        </nav>

        <div className="row gap-2">
          <ThemeControls compact />
          <Link to="/login" className="btn btn--ghost">
            Sign in
          </Link>
          <Link to="/register" className="btn btn--primary">
            Get started
          </Link>
        </div>
      </header>

      <section className="landing__hero">
        <div className="landing__grid decorative" aria-hidden="true" />

        <motion.div
          className="landing__hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="landing__pill">
            <span className="landing__pulse" aria-hidden="true" />
            Real-time · MongoDB-powered · Built for teams
          </span>

          <h1 className="landing__title">
            Turn team work into <span className="landing__accent">visible progress.</span>
          </h1>

          <p className="landing__lede">
            Orvexa connects projects, tasks and people to analytics that are computed from your
            real data — not estimated, not decorative. Plan on a board, collaborate live, and see
            exactly where a project stands and why.
          </p>

          <div className="row gap-3 row--wrap">
            <Link to="/register" className="btn btn--primary btn--lg">
              Get started <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn--secondary btn--lg">
              Explore demo
            </Link>
          </div>

          <ul className="landing__ticks">
            {['No credit card', 'Runs locally in minutes', 'Open source stack'].map((t) => (
              <li key={t}>
                <Check size={13} /> {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="landing__preview"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
        >
          <ProductPreview />
        </motion.div>
      </section>

      <section id="features" className="landing__section">
        <div className="landing__section-head">
          <p className="eyebrow">What makes it different</p>
          <h2>Built so every number can be traced back to real work</h2>
        </div>

        <div className="landing__features">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="landing__feature">
              <span className="landing__feature-icon">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <h3>{title}</h3>
              <p className="muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="landing__section landing__section--alt">
        <div className="landing__section-head">
          <p className="eyebrow">How it works</p>
          <h2>Three steps from empty workspace to running team</h2>
        </div>

        <ol className="landing__steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="landing__step-n mono">{s.n}</span>
              <h3>{s.title}</h3>
              <p className="muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="proof" className="landing__section">
        <div className="landing__section-head">
          <p className="eyebrow">From the teams using it</p>
          <h2>Less reporting. More delivering.</h2>
        </div>

        <div className="landing__quotes">
          {PROOF.map((p) => (
            <figure key={p.name} className="landing__quote">
              <blockquote>“{p.quote}”</blockquote>
              <figcaption>
                <span className="landing__quote-name">{p.name}</span>
                <span className="muted">{p.detail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="landing__cta">
        <div className="landing__cta-inner">
          <h2>Ready to see where your projects actually stand?</h2>
          <p className="muted">
            Set it up locally, seed a realistic workspace, and have a working dashboard in a few
            minutes.
          </p>
          <div className="row gap-3">
            <Link to="/register" className="btn btn--primary btn--lg">
              Create your workspace <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn--secondary btn--lg">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <div className="col gap-2">
            <span className="landing__brand">
              <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="var(--primary-soft-2)" />
                <path
                  d="M8 21.5 13.2 10.5h2.3l5.2 11h-2.5l-1.05-2.4h-5.6L10.5 21.5H8Zm4.4-4.3h4l-2-4.6-2 4.6Z"
                  fill="var(--primary)"
                />
              </svg>
              Orvexa
            </span>
            <p className="muted">Turn team work into visible progress.</p>
          </div>

          <div className="landing__footer-cols">
            <div>
              <p className="eyebrow">Product</p>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <Link to="/register">Get started</Link>
            </div>
            <div>
              <p className="eyebrow">Built with</p>
              <span className="muted">React · Vite</span>
              <span className="muted">Node · Express</span>
              <span className="muted">MongoDB · Socket.IO</span>
            </div>
            <div>
              <p className="eyebrow">Developer</p>
              <span className="muted">Nilusha Madhuwanthi</span>
              <span className="muted">Full-Stack Engineer</span>
            </div>
          </div>
        </div>
        <div className="landing__legal">
          <span className="muted">© {new Date().getFullYear()} Orvexa</span>
          <span className="muted">A portfolio project — built to production standards.</span>
        </div>
      </footer>
    </div>
  );
}

/** Static, honest preview of the real dashboard layout — no fabricated metrics. */
function ProductPreview() {
  return (
    <div className="preview" aria-label="Orvexa dashboard preview" role="img">
      <div className="preview__chrome">
        <span className="preview__dot" />
        <span className="preview__dot" />
        <span className="preview__dot" />
        <span className="preview__url mono">orvexa.app/dashboard</span>
      </div>

      <div className="preview__body">
        <aside className="preview__side">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`preview__nav ${i === 0 ? 'is-active' : ''}`} />
          ))}
        </aside>

        <div className="preview__main">
          <div className="preview__kpis">
            {['var(--viz-1)', 'var(--viz-2)', 'var(--viz-4)', 'var(--viz-5)'].map((c, i) => (
              <div key={c} className="preview__kpi">
                <span className="preview__kpi-bar" style={{ background: c }} />
                <span className="preview__kpi-num" style={{ width: `${38 + i * 8}%` }} />
                <span className="preview__kpi-label" />
              </div>
            ))}
          </div>

          <div className="preview__row">
            <div className="preview__chart">
              <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 78 L30 70 L60 74 L90 55 L120 60 L150 42 L180 46 L210 30 L240 34 L270 20 L300 24"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M0 78 L30 70 L60 74 L90 55 L120 60 L150 42 L180 46 L210 30 L240 34 L270 20 L300 24 L300 100 L0 100 Z"
                  fill="url(#pv)"
                />
              </svg>
            </div>

            <div className="preview__ring">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface-3)" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="251"
                  strokeDashoffset="63"
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
          </div>

          <div className="preview__cards">
            {['var(--viz-1)', 'var(--viz-2)', 'var(--viz-6)'].map((c) => (
              <div key={c} className="preview__card">
                <span className="preview__card-tag" style={{ background: c }} />
                <span className="preview__card-line" />
                <span className="preview__card-line preview__card-line--short" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
