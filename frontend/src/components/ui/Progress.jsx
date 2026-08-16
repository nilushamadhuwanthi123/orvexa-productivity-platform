import './Progress.css';

export function ProgressBar({ value = 0, tone = 'primary', size = 'md', label }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`progress progress--${size}`}>
      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className={`progress__fill progress__fill--${tone}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/** Circular meter used by the weekly progress tracker. */
export function ProgressRing({ value = 0, size = 132, stroke = 9, tone = 'var(--primary)', children }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__center">{children}</div>
    </div>
  );
}
