import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { pluralize } from '../../utils/format.js';
import './dashboard.css';

const DAYS = 182; // ~26 weeks, one column per week

/** GitHub-style contribution grid built from real completion dates. */
export default function StreakHeatmap({ streak }) {
  const { cells, max } = useMemo(() => {
    const counts = new Map(streak.heatmap.map((d) => [d.date, d.count]));
    const peak = Math.max(1, ...streak.heatmap.map((d) => d.count));

    const out = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (DAYS - 1));
    // Align the first column to a Sunday so weekday rows line up.
    start.setDate(start.getDate() - start.getDay());

    const cursor = new Date(start);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      const count = counts.get(key) || 0;
      out.push({
        date: key,
        count,
        level: count === 0 ? 0 : Math.min(4, Math.ceil((count / peak) * 4)),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return { cells: out, max: peak };
  }, [streak.heatmap]);

  return (
    <section className="panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">
            <Flame size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--warning)' }} />
            Productivity streak
          </h2>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {streak.current > 0
              ? `${pluralize(streak.current, 'day')} in a row · best ${streak.best}`
              : 'Complete a task today to start a streak'}
          </p>
        </div>
      </header>

      <div className="panel__body">
        <div className="heatmap" role="img" aria-label={`Completion activity over the last ${DAYS} days`}>
          {cells.map((c) => (
            <span
              key={c.date}
              className="heatmap__cell"
              data-level={c.level}
              title={`${c.date}: ${c.count === 0 ? 'no tasks' : pluralize(c.count, 'task')} completed`}
            />
          ))}
        </div>

        <div className="heatmap__legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="heatmap__cell" data-level={l} />
          ))}
          <span>More</span>
          <span style={{ marginLeft: 'auto' }}>Peak: {pluralize(max, 'task')} in a day</span>
        </div>
      </div>
    </section>
  );
}
