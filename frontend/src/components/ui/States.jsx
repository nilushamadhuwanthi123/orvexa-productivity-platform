import { AlertTriangle, Inbox, RefreshCw, WifiOff } from 'lucide-react';
import './States.css';

export function Skeleton({ w = '100%', h = 16, r, style }) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: r || 'var(--r-sm)', ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card col gap-3" aria-hidden="true">
      <Skeleton w="45%" h={13} />
      <Skeleton w="70%" h={26} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} w={`${90 - i * 12}%`} h={11} />
      ))}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" style={{ width: 22, height: 22, color: 'var(--primary)' }} />
      <p className="muted">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="state">
      <span className="state__icon">
        <Icon size={22} strokeWidth={1.6} />
      </span>
      <h3 className="state__title">{title}</h3>
      {description && <p className="muted state__desc">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  const offline = !navigator.onLine || error?.code === 'ERR_NETWORK';

  return (
    <div className="state">
      <span className="state__icon state__icon--danger">
        {offline ? <WifiOff size={22} strokeWidth={1.6} /> : <AlertTriangle size={22} strokeWidth={1.6} />}
      </span>
      <h3 className="state__title">{offline ? "You're offline" : title}</h3>
      <p className="muted state__desc">
        {offline
          ? 'Reconnect to load the latest data. Nothing has been saved while offline.'
          : error?.message || 'An unexpected error occurred.'}
      </p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
