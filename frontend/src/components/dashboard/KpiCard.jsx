import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import './dashboard.css';

/**
 * `change` is a real percentage from the API. When the API cannot compute a
 * trend it sends null, and the card shows nothing rather than a fake 0%.
 * `invert` marks metrics where an increase is bad (overdue tasks).
 */
export default function KpiCard({
  label,
  value,
  change = null,
  invert = false,
  hint,
  tone = 'var(--viz-1)',
  spark = null,
  icon: Icon,
}) {
  const positive = change === null ? null : invert ? change < 0 : change > 0;
  const TrendIcon = change === null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const trendColor =
    positive === null || change === 0
      ? 'var(--text-subtle)'
      : positive
        ? 'var(--primary)'
        : 'var(--danger)';

  return (
    <article className="kpi card--interactive">
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        {Icon && (
          <span className="kpi__icon" style={{ color: tone, background: `color-mix(in oklab, ${tone} 14%, transparent)` }}>
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
      </div>

      <div className="kpi__value tabular">{value}</div>

      <div className="kpi__foot">
        {change !== null && (
          <span className="kpi__trend" style={{ color: trendColor }}>
            <TrendIcon size={13} />
            {change === 0 ? 'No change' : `${Math.abs(change)}%`}
          </span>
        )}
        {hint && <span className="kpi__hint">{hint}</span>}
      </div>

      {spark?.length > 1 && (
        <div className="kpi__spark" aria-hidden="true">
          <ResponsiveContainer width="100%" height={34}>
            <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sp-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={tone} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={tone}
                strokeWidth={1.6}
                fill={`url(#sp-${label.replace(/\s/g, '')})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
