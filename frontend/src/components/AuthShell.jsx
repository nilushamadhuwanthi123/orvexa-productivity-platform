import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeControls from './ThemeControls.jsx';
import './AuthShell.css';

const POINTS = [
  'Analytics computed from your real task data, never estimated',
  'Live collaboration over Socket.IO — no refresh required',
  'Project health that always tells you the reason behind the score',
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__grid decorative" aria-hidden="true" />

        <Link to="/" className="auth__brand">
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

        <div className="auth__aside-body">
          <h2 className="auth__headline">Turn team work into visible progress.</h2>
          <ul className="auth__points">
            {POINTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <p className="auth__aside-foot muted">
          A production-grade MERN platform — React · Express · MongoDB · Socket.IO
        </p>
      </aside>

      <main className="auth__main">
        <div className="auth__top">
          <Link to="/" className="auth__brand auth__brand--mobile">
            <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="var(--primary-soft-2)" />
              <path
                d="M8 21.5 13.2 10.5h2.3l5.2 11h-2.5l-1.05-2.4h-5.6L10.5 21.5H8Zm4.4-4.3h4l-2-4.6-2 4.6Z"
                fill="var(--primary)"
              />
            </svg>
            <span>Orvexa</span>
          </Link>
          <ThemeControls compact />
        </div>

        <motion.div
          className="auth__card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <header className="auth__head">
            <h1 className="auth__title">{title}</h1>
            {subtitle && <p className="muted">{subtitle}</p>}
          </header>

          {children}

          {footer && <footer className="auth__foot">{footer}</footer>}
        </motion.div>
      </main>
    </div>
  );
}
