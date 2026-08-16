import { useCallback } from 'react';
import { FolderKanban, CheckCircle2, Loader, AlertTriangle, Gauge } from 'lucide-react';
import { analyticsApi } from '../api/endpoints.js';
import { useAsync } from '../hooks/useAsync.js';
import { useRealtime } from '../hooks/useSocket.js';
import { useAuthStore } from '../store/authStore.js';
import { greeting, fmtDate } from '../utils/format.js';

import KpiCard from '../components/dashboard/KpiCard.jsx';
import ProgressTracker from '../components/dashboard/ProgressTracker.jsx';
import Insights from '../components/dashboard/Insights.jsx';
import ProjectHealthList from '../components/dashboard/ProjectHealthList.jsx';
import Deadlines from '../components/dashboard/Deadlines.jsx';
import StreakHeatmap from '../components/dashboard/StreakHeatmap.jsx';
import Goals from '../components/dashboard/Goals.jsx';
import ActivityChart from '../components/charts/ActivityChart.jsx';
import { SkeletonCard, ErrorState } from '../components/ui/States.jsx';
import '../components/dashboard/dashboard.css';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, loading, error, refetch } = useAsync(() => analyticsApi.dashboard(), []);

  // Any task change in a project we can see makes these aggregates stale.
  const reload = useCallback(() => refetch().catch(() => {}), [refetch]);
  useRealtime('task:created', reload);
  useRealtime('task:updated', reload);
  useRealtime('task:moved', reload);
  useRealtime('task:deleted', reload);

  if (loading && !data) {
    return (
      <>
        <div className="dash__hello">
          <div className="skeleton" style={{ width: 280, height: 30, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 340, height: 15 }} />
        </div>
        <div className="dash__kpis">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 128, borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
        <div className="dash__cols">
          <div className="dash__col">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={5} />
          </div>
          <div className="dash__col">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={4} />
          </div>
        </div>
      </>
    );
  }

  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load your dashboard" />;
  if (!data) return null;

  const { kpis, progress, projects, deadlines, goals, series, insights } = data;
  const recent = series.slice(-14).map((d) => ({ v: d.completed }));

  return (
    <>
      <header className="dash__hello">
        <h1 className="dash__greeting">
          {greeting()}, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="muted">
          {kpis.overdueTasks > 0 || progress.openTasks > 0
            ? "Here's what needs your attention today."
            : 'Nothing overdue and nothing open — a good place to plan ahead.'}
          {' · '}
          <time dateTime={new Date().toISOString()}>{fmtDate(new Date(), 'EEEE, d MMMM')}</time>
        </p>
      </header>

      <div className="dash__kpis">
        <KpiCard
          label="Active projects"
          value={kpis.activeProjects}
          icon={FolderKanban}
          tone="var(--viz-1)"
          hint={`${kpis.totalTasks} tasks total`}
        />
        <KpiCard
          label="Completed this week"
          value={kpis.completedTasks}
          change={kpis.completedTasksChange}
          icon={CheckCircle2}
          tone="var(--viz-1)"
          spark={recent}
          hint="vs last week"
        />
        <KpiCard
          label="In progress"
          value={kpis.inProgressTasks}
          icon={Loader}
          tone="var(--viz-4)"
          hint="across your projects"
        />
        <KpiCard
          label="Overdue"
          value={kpis.overdueTasks}
          icon={AlertTriangle}
          tone="var(--danger)"
          hint={kpis.overdueTasks === 0 ? 'nothing past due' : 'needs attention'}
        />
        <KpiCard
          label="Team productivity"
          value={`${kpis.productivity}%`}
          icon={Gauge}
          tone="var(--viz-2)"
          hint="tasks completed overall"
        />
      </div>

      <div className="dash__cols">
        <div className="dash__col">
          <ProgressTracker progress={progress} />

          <section className="panel">
            <header className="panel__head">
              <div>
                <h2 className="panel__title">Activity</h2>
                <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  Tasks created and completed over the last 30 days
                </p>
              </div>
            </header>
            <div className="panel__body">
              <ActivityChart data={series} />
            </div>
          </section>

          <ProjectHealthList projects={projects} />
          <StreakHeatmap streak={progress.streak} />
        </div>

        <div className="dash__col">
          <Insights insights={insights} />
          <Deadlines deadlines={deadlines} />
          <Goals goals={goals} />
        </div>
      </div>
    </>
  );
}
