import { useState } from 'react';
import { analyticsApi } from '../api/endpoints.js';
import { useAsync } from '../hooks/useAsync.js';
import ActivityChart from '../components/charts/ActivityChart.jsx';
import { Loading, ErrorState, EmptyState } from '../components/ui/States.jsx';
import { statusMeta, priorityMeta, projectColor, VIZ } from '../constants/index.js';
import { BarChart3 } from 'lucide-react';
import '../components/charts/charts.css';
import '../components/dashboard/dashboard.css';

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState('all');

  const { data, loading, error, refetch } = useAsync(
    () => analyticsApi.productivity({ days, scope }),
    [days, scope]
  );

  if (loading && !data) return <Loading label="Crunching your data…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load analytics" />;
  if (!data) return null;

  const { series, byStatus, byPriority, byProject, completionRate } = data;
  const totalStatus = byStatus.reduce((n, s) => n + s.count, 0);
  const totalPriority = byPriority.reduce((n, s) => n + s.count, 0);
  const totalCompleted = series.reduce((n, d) => n + d.completed, 0);
  const totalCreated = series.reduce((n, d) => n + d.created, 0);

  if (totalStatus === 0) {
    return (
      <>
        <header className="page-head">
          <div>
            <h1 className="page-head__title">Analytics</h1>
            <p className="page-head__sub">Everything here is aggregated from your task data.</p>
          </div>
        </header>
        <EmptyState
          icon={BarChart3}
          title="No data to analyse yet"
          description="Create projects and tasks — analytics are computed from real records, so there is nothing to show until there is work to measure."
        />
      </>
    );
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Analytics</h1>
          <p className="page-head__sub">
            Aggregated from your task records — {totalCompleted} completed and {totalCreated} created in
            the selected window.
          </p>
        </div>

        <div className="row gap-2">
          <div className="segmented">
            <button
              type="button"
              className={`segmented__item ${scope === 'all' ? 'is-active' : ''}`}
              onClick={() => setScope('all')}
            >
              Everyone
            </button>
            <button
              type="button"
              className={`segmented__item ${scope === 'me' ? 'is-active' : ''}`}
              onClick={() => setScope('me')}
            >
              Just me
            </button>
          </div>

          <div className="segmented">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                type="button"
                className={`segmented__item ${days === w.days ? 'is-active' : ''}`}
                onClick={() => setDays(w.days)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="dash__kpis">
        <Stat label="Completed" value={totalCompleted} tone="var(--viz-1)" />
        <Stat label="Created" value={totalCreated} tone="var(--viz-4)" />
        <Stat label="Completion rate" value={`${completionRate}%`} tone="var(--viz-2)" />
        <Stat
          label="Net change"
          value={`${totalCompleted - totalCreated >= 0 ? '+' : ''}${totalCompleted - totalCreated}`}
          tone={totalCompleted >= totalCreated ? 'var(--viz-1)' : 'var(--danger)'}
          hint={totalCompleted >= totalCreated ? 'closing more than opening' : 'backlog is growing'}
        />
      </div>

      <section className="panel" style={{ marginBottom: 'var(--sp-5)' }}>
        <header className="panel__head">
          <div>
            <h2 className="panel__title">Productivity trend</h2>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Tasks created and completed per day
            </p>
          </div>
        </header>
        <div className="panel__body">
          <ActivityChart data={series} height={300} />
        </div>
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section className="panel">
          <header className="panel__head">
            <h2 className="panel__title">Distribution by status</h2>
          </header>
          <div className="panel__body dist">
            {byStatus.map((s) => {
              const meta = statusMeta(s._id);
              return (
                <div key={s._id} className="dist__row">
                  <span className="muted">{meta.label}</span>
                  <span className="dist__bar">
                    <span
                      className="dist__fill"
                      style={{ width: `${(s.count / totalStatus) * 100}%`, background: meta.color }}
                    />
                  </span>
                  <span className="mono">
                    {s.count} · {Math.round((s.count / totalStatus) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <header className="panel__head">
            <h2 className="panel__title">Distribution by priority</h2>
          </header>
          <div className="panel__body dist">
            {byPriority.map((p) => {
              const meta = priorityMeta(p._id);
              return (
                <div key={p._id} className="dist__row">
                  <span className="muted">{meta.label}</span>
                  <span className="dist__bar">
                    <span
                      className="dist__fill"
                      style={{ width: `${(p.count / totalPriority) * 100}%`, background: meta.color }}
                    />
                  </span>
                  <span className="mono">
                    {p.count} · {Math.round((p.count / totalPriority) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 'var(--sp-5)' }}>
        <header className="panel__head">
          <div>
            <h2 className="panel__title">Completion by project</h2>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Technical palette — kept distinct from the interface colours
            </p>
          </div>
        </header>
        <div className="panel__body dist">
          {byProject.length === 0 ? (
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              No projects with tasks in this window.
            </p>
          ) : (
            byProject.map((p, i) => (
              <div key={p.name} className="dist__row">
                <span className="truncate muted">{p.name}</span>
                <span className="dist__bar">
                  <span
                    className="dist__fill"
                    style={{
                      width: `${p.percent}%`,
                      background: VIZ.technical[i % VIZ.technical.length],
                    }}
                  />
                </span>
                <span className="mono">
                  {p.done}/{p.total} · {p.percent}%
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, tone, hint }) {
  return (
    <div className="kpi">
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
      </div>
      <div className="kpi__value tabular" style={{ color: tone }}>
        {value}
      </div>
      <div className="kpi__foot">{hint && <span className="kpi__hint">{hint}</span>}</div>
    </div>
  );
}
