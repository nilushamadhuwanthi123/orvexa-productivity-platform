import { Component } from 'react';
import { AlertOctagon } from 'lucide-react';

/**
 * Catches render-time errors so a single broken screen cannot blank the app.
 * The stack is only shown in development.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[orvexa] render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="state" style={{ minHeight: '70vh' }}>
        <span className="state__icon state__icon--danger">
          <AlertOctagon size={22} strokeWidth={1.6} />
        </span>
        <h1 className="state__title">This screen ran into a problem</h1>
        <p className="muted state__desc">
          The rest of the app is still running. Reloading usually clears it.
        </p>
        {import.meta.env.DEV && (
          <pre
            className="mono"
            style={{
              maxWidth: 640,
              textAlign: 'left',
              fontSize: 'var(--text-xs)',
              color: 'var(--danger)',
              background: 'var(--surface-2)',
              padding: 'var(--sp-4)',
              borderRadius: 'var(--r-md)',
              overflow: 'auto',
            }}
          >
            {error.message}
          </pre>
        )}
        <div className="row gap-2">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
