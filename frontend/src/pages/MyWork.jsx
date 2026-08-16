import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Target, CalendarClock, AlertTriangle, Gauge } from 'lucide-react';
import { taskApi, analyticsApi } from '../api/endpoints.js';
import { useAsync } from '../hooks/useAsync.js';
import { useRealtime } from '../hooks/useSocket.js';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import { TaskCardBody } from '../components/tasks/TaskCard.jsx';
import TaskDrawer from '../components/tasks/TaskDrawer.jsx';
import { ProgressRing } from '../components/ui/Progress.jsx';
import { EmptyState, ErrorState, SkeletonCard } from '../components/ui/States.jsx';
import { greeting, pluralize, isOverdue } from '../utils/format.js';
import '../components/dashboard/dashboard.css';
import '../components/tasks/tasks.css';

const isToday = (d) => {
  if (!d) return false;
  const t = new Date();
  const x = new Date(d);
  return x.toDateString() === t.toDateString();
};

export default function MyWork() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(null);

  const { data, loading, error, refetch } = useAsync(
    () => Promise.all([taskApi.list({ assignee: 'me', limit: 200 }), analyticsApi.dashboard()]),
    []
  );

  const reload = useCallback(() => refetch().catch(() => {}), [refetch]);
  useRealtime('task:updated', reload);
  useRealtime('task:moved', reload);
  useRealtime('task:created', reload);

  const buckets = useMemo(() => {
    if (!data) return null;
    const [tasksRes] = data;
    const tasks = tasksRes.data;
    const open = tasks.filter((t) => t.status !== 'done');

    return {
      overdue: open.filter(isOverdue),
      today: open.filter((t) => isToday(t.dueDate) && !isOverdue(t)),
      focus: open
        .filter((t) => ['in_progress', 'in_review'].includes(t.status))
        .sort((a, b) => (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity)),
      upcoming: open
        .filter((t) => t.dueDate && !isToday(t.dueDate) && !isOverdue(t))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 12),
      all: tasks,
      open,
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={4} />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load your work" />;
  if (!buckets) return null;

  const [, dash] = data;
  const progress = dash.progress;

  /**
   * Focus score, computed transparently from the four inputs shown below it.
   * It is a weighted read of the user's own data — nothing hidden, nothing random.
   */
  const focusScore = (() => {
    const done = progress.completed;
    const goal = Math.max(1, progress.weeklyGoal);
    const goalPart = Math.min(1, done / goal) * 45;
    const overduePart = Math.max(0, 25 - buckets.overdue.length * 5);
    const timePart = Math.min(1, progress.trackedHours / 20) * 15;
    const streakPart = Math.min(1, progress.streak.current / 5) * 15;
    return Math.round(goalPart + overduePart + timePart + streakPart);
  })();

  const open = (t) => setOpenId(t._id);

  const Section = ({ title, icon: Icon, tone, tasks, empty }) => (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">
          <Icon size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: tone }} />
          {title}
        </h2>
        <span className="column__count">{tasks.length}</span>
      </header>
      <div className="panel__body col gap-2">
        {tasks.length === 0 ? (
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {empty}
          </p>
        ) : (
          tasks.map((t) => <TaskCardBody key={t._id} task={t} onOpen={() => open(t)} />)
        )}
      </div>
    </section>
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-head__title">
            {greeting()}, {user.name.split(' ')[0]}
          </h1>
          <p className="page-head__sub">
            {buckets.open.length === 0
              ? 'Nothing open right now.'
              : `${pluralize(buckets.open.length, 'open task')} assigned to you.`}
          </p>
        </div>
      </header>

      <section className="panel" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="panel__body">
          <div className="tracker">
            <ProgressRing
              value={focusScore}
              size={132}
              stroke={10}
              tone={focusScore >= 70 ? 'var(--primary)' : focusScore >= 40 ? 'var(--accent)' : 'var(--warning)'}
            >
              <span className="tracker__pct tabular">{focusScore}</span>
              <span className="tracker__pct-sub">Focus score</span>
            </ProgressRing>

            <div>
              <p className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)' }}>
                Calculated from the four figures below — weekly goal progress (45), overdue work (25),
                time tracked (15) and your current streak (15).
              </p>
              <div className="tracker__stats">
                <div>
                  <p className="tracker__stat-value tabular">
                    {progress.completed}/{progress.weeklyGoal}
                  </p>
                  <p className="tracker__stat-label">Weekly goal</p>
                </div>
                <div>
                  <p className="tracker__stat-value tabular" style={{ color: buckets.overdue.length ? 'var(--danger)' : undefined }}>
                    {buckets.overdue.length}
                  </p>
                  <p className="tracker__stat-label">Overdue</p>
                </div>
                <div>
                  <p className="tracker__stat-value tabular">{progress.trackedHours}h</p>
                  <p className="tracker__stat-label">Tracked this week</p>
                </div>
                <div>
                  <p className="tracker__stat-value tabular">{progress.streak.current}</p>
                  <p className="tracker__stat-label">Day streak</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {buckets.all.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="No tasks assigned to you yet"
          description="Once someone assigns you work — or you create a task and assign it to yourself — it will show up here."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/projects')}>
              Browse projects
            </button>
          }
        />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <Section
            title="Overdue"
            icon={AlertTriangle}
            tone="var(--danger)"
            tasks={buckets.overdue}
            empty="Nothing is past its due date."
          />
          <Section
            title="Today"
            icon={Sun}
            tone="var(--warning)"
            tasks={buckets.today}
            empty="Nothing due today."
          />
          <Section
            title="Focus"
            icon={Target}
            tone="var(--primary)"
            tasks={buckets.focus}
            empty="Nothing in progress or in review."
          />
          <Section
            title="Upcoming"
            icon={CalendarClock}
            tone="var(--info)"
            tasks={buckets.upcoming}
            empty="Nothing scheduled ahead."
          />
        </div>
      )}

      <TaskDrawer
        taskId={openId}
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        onChanged={reload}
        onDeleted={reload}
      />
    </>
  );
}
