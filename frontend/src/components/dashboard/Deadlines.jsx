import { Link } from 'react-router-dom';
import { CalendarCheck2 } from 'lucide-react';
import { EmptyState } from '../ui/States.jsx';
import Avatar from '../ui/Avatar.jsx';
import { fmtDate, pluralize } from '../../utils/format.js';
import { projectColor } from '../../constants/index.js';
import './dashboard.css';

const GROUPS = [
  { key: 'overdue', label: 'Overdue', tone: 'var(--danger)' },
  { key: 'today', label: 'Today', tone: 'var(--warning)' },
  { key: 'tomorrow', label: 'Tomorrow', tone: 'var(--accent)' },
  { key: 'thisWeek', label: 'This week', tone: 'var(--info)' },
  { key: 'later', label: 'Upcoming', tone: 'var(--text-subtle)' },
];

export default function Deadlines({ deadlines }) {
  const total = GROUPS.reduce((n, g) => n + (deadlines[g.key]?.length || 0), 0);

  return (
    <section className="panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Upcoming deadlines</h2>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {total === 0 ? 'Nothing due in the next 30 days' : `${pluralize(total, 'task')} due soon`}
          </p>
        </div>
      </header>

      <div className="panel__body">
        {total === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="Nothing due right now"
            description="Tasks with a due date in the next 30 days will appear here, grouped by urgency."
          />
        ) : (
          <div className="deadlines">
            {GROUPS.map((g) => {
              const items = deadlines[g.key] || [];
              if (!items.length) return null;

              return (
                <div key={g.key} className="deadline-group">
                  <div className="deadline-group__label">
                    <span className="eyebrow" style={{ color: g.tone }}>
                      {g.label}
                    </span>
                    <span className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                      {items.length}
                    </span>
                  </div>

                  {items.slice(0, 5).map((t) => (
                    <Link
                      key={t._id}
                      to={`/projects/${t.project?._id}/board?task=${t._id}`}
                      className={`deadline deadline--${g.key}`}
                    >
                      <span className="deadline__rail" />
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className="deadline__title truncate" style={{ display: 'block' }}>
                          {t.title}
                        </span>
                        <span className="deadline__meta">
                          <span
                            style={{
                              display: 'inline-block',
                              width: 6,
                              height: 6,
                              borderRadius: 2,
                              background: projectColor(t.project?.color),
                              marginRight: 5,
                              verticalAlign: 'middle',
                            }}
                          />
                          {t.project?.name} · {fmtDate(t.dueDate, 'd MMM')}
                        </span>
                      </span>
                      {t.assignee && <Avatar user={t.assignee} size="xs" />}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
