import { useEffect, useMemo, useState } from 'react';
import { GanttChartSquare, Flag } from 'lucide-react';
import { projectApi } from '../../api/endpoints.js';
import { EmptyState } from '../ui/States.jsx';
import { statusMeta } from '../../constants/index.js';
import { fmtDate } from '../../utils/format.js';
import './projects.css';

const DAY = 86400000;

/**
 * Responsive Gantt-style timeline. The window is derived from the actual
 * earliest and latest dates in the project, so bars are always in proportion
 * to real dates rather than an arbitrary fixed scale.
 */
export default function ProjectTimeline({ project, tasks }) {
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    projectApi
      .milestones(project._id)
      .then((r) => setMilestones(r.milestones))
      .catch(() => setMilestones([]));
  }, [project._id]);

  const dated = useMemo(() => tasks.filter((t) => t.dueDate || t.startDate), [tasks]);

  const { start, end, span } = useMemo(() => {
    const dates = [
      project.startDate && new Date(project.startDate),
      project.deadline && new Date(project.deadline),
      ...dated.flatMap((t) => [
        t.startDate && new Date(t.startDate),
        t.dueDate && new Date(t.dueDate),
      ]),
      ...milestones.map((m) => m.dueDate && new Date(m.dueDate)),
      new Date(),
    ].filter(Boolean);

    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 2);
    return { start: min, end: max, span: Math.max(1, (max - min) / DAY) };
  }, [project, dated, milestones]);

  const pct = (date) => ((new Date(date) - start) / DAY / span) * 100;

  if (dated.length === 0 && milestones.length === 0) {
    return (
      <EmptyState
        icon={GanttChartSquare}
        title="Nothing to place on a timeline yet"
        description="Tasks need a due date (and optionally a start date) before they can be plotted. Milestones appear here too."
      />
    );
  }

  const ticks = Array.from({ length: 5 }, (_, i) => new Date(start.getTime() + (span / 4) * i * DAY));

  return (
    <section className="panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Timeline</h2>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {fmtDate(start)} → {fmtDate(end)}
          </p>
        </div>
      </header>

      <div className="panel__body">
        <div className="timeline">
          <div className="timeline__grid">
            <div className="timeline__axis">
              <span />
              <span className="timeline__ticks">
                {ticks.map((t, i) => (
                  <span key={i}>{fmtDate(t, 'd MMM')}</span>
                ))}
              </span>
            </div>

            {/* project bar */}
            <div className="timeline__row">
              <span className="timeline__label" style={{ fontWeight: 600 }}>
                {project.name}
              </span>
              <span className="timeline__track">
                <span
                  className="timeline__bar"
                  style={{
                    left: `${pct(project.startDate || start)}%`,
                    width: `${Math.max(2, pct(project.deadline || end) - pct(project.startDate || start))}%`,
                    background: 'var(--primary)',
                  }}
                >
                  {project.health.completionRate}%
                </span>
                <span className="timeline__today" style={{ left: `${pct(new Date())}%` }} title="Today" />
              </span>
            </div>

            {milestones.map((m) => (
              <div key={m._id} className="timeline__row">
                <span className="timeline__label">
                  <Flag size={12} style={{ verticalAlign: '-1px', marginRight: 5, color: 'var(--accent)' }} />
                  {m.name}
                </span>
                <span className="timeline__track">
                  {m.dueDate && (
                    <span
                      className="timeline__bar"
                      style={{
                        left: `${pct(m.dueDate)}%`,
                        width: '10px',
                        background: 'var(--accent)',
                        borderRadius: 'var(--r-full)',
                      }}
                      title={`${m.name} — ${fmtDate(m.dueDate)} · ${m.percent}% of its tasks done`}
                    />
                  )}
                  <span className="timeline__today" style={{ left: `${pct(new Date())}%` }} />
                </span>
              </div>
            ))}

            {dated.map((t) => {
              const from = t.startDate || t.createdAt;
              const to = t.dueDate || t.startDate;
              const left = pct(from);
              const width = Math.max(1.2, pct(to) - left);
              const meta = statusMeta(t.status);

              return (
                <div key={t._id} className="timeline__row">
                  <span className="timeline__label" title={t.title}>
                    {t.title}
                  </span>
                  <span className="timeline__track">
                    <span
                      className="timeline__bar"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: meta.color,
                        opacity: t.status === 'done' ? 0.55 : 1,
                      }}
                      title={`${t.title} — ${meta.label}${t.dueDate ? ` · due ${fmtDate(t.dueDate)}` : ''}`}
                    />
                    <span className="timeline__today" style={{ left: `${pct(new Date())}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--sp-4)' }}>
          The red line marks today. Only tasks with a due date appear here — {tasks.length - dated.length} task
          {tasks.length - dated.length === 1 ? ' has' : 's have'} no date set.
        </p>
      </div>
    </section>
  );
}
