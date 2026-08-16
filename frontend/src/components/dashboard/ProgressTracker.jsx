import { Flame, Timer, Target, CalendarCheck } from 'lucide-react';
import { ProgressRing } from '../ui/Progress.jsx';
import { pluralize } from '../../utils/format.js';
import './dashboard.css';

/**
 * Weekly progress against the user's own goal. Every figure comes from
 * /api/analytics/dashboard; when a figure cannot be computed (for example
 * on-time rate with no completed dated tasks) it renders as "—".
 */
export default function ProgressTracker({ progress }) {
  const {
    percent,
    completed,
    weeklyGoal,
    remaining,
    onTimeRate,
    trackedHours,
    streak,
    openTasks,
  } = progress;

  const tone =
    percent >= 80 ? 'var(--primary)' : percent >= 45 ? 'var(--accent)' : 'var(--warning)';

  return (
    <section className="panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">My progress</h2>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            This week, against your goal of {pluralize(weeklyGoal, 'task')}
          </p>
        </div>
      </header>

      <div className="panel__body">
        <div className="tracker">
          <ProgressRing value={percent} tone={tone} size={140} stroke={10}>
            <span className="tracker__pct tabular">{percent}%</span>
            <span className="tracker__pct-sub">
              {completed} / {weeklyGoal}
            </span>
          </ProgressRing>

          <div className="tracker__stats">
            <Stat
              icon={CalendarCheck}
              value={completed}
              label="Completed this week"
              tone="var(--primary)"
            />
            <Stat
              icon={Target}
              value={remaining === 0 ? 'Goal met' : remaining}
              label={remaining === 0 ? 'Weekly goal reached' : 'Remaining to goal'}
              tone="var(--accent)"
            />
            <Stat
              icon={Flame}
              value={streak.current}
              label={`Day streak · best ${streak.best}`}
              tone="var(--warning)"
            />
            <Stat
              icon={Timer}
              value={`${trackedHours}h`}
              label="Tracked this week"
              tone="var(--info)"
            />
            <Stat
              value={onTimeRate === null ? '—' : `${onTimeRate}%`}
              label={
                onTimeRate === null ? 'On-time rate (no data yet)' : 'Completed on or before due'
              }
            />
            <Stat value={openTasks} label="Open tasks assigned to you" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, value, label, tone }) {
  return (
    <div>
      <p className="tracker__stat-value tabular" style={tone ? { color: tone } : undefined}>
        {Icon && <Icon size={14} style={{ verticalAlign: '0px', marginRight: 5 }} />}
        {value}
      </p>
      <p className="tracker__stat-label">{label}</p>
    </div>
  );
}
