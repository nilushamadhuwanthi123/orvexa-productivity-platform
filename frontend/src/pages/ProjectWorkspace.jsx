import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  GanttChartSquare,
  Users,
  Activity as ActivityIcon,
  BarChart3,
  Plus,
  Settings2,
  ArrowLeft,
} from 'lucide-react';
import { projectApi, taskApi, systemApi, analyticsApi } from '../api/endpoints.js';
import { useAsync } from '../hooks/useAsync.js';
import { useRealtime, useProjectRoom } from '../hooks/useSocket.js';
import { useUIStore } from '../store/uiStore.js';
import { useAuthStore } from '../store/authStore.js';

import KanbanBoard from '../components/tasks/KanbanBoard.jsx';
import TaskDrawer from '../components/tasks/TaskDrawer.jsx';
import TaskFormModal from '../components/tasks/TaskFormModal.jsx';
import ProjectFormModal from '../components/projects/ProjectFormModal.jsx';
import ProjectTimeline from '../components/projects/ProjectTimeline.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import ActivityChart from '../components/charts/ActivityChart.jsx';
import { ProgressBar } from '../components/ui/Progress.jsx';
import Avatar, { AvatarGroup } from '../components/ui/Avatar.jsx';
import { Loading, ErrorState, EmptyState } from '../components/ui/States.jsx';
import { projectColor, HEALTH_LABELS, statusMeta } from '../constants/index.js';
import { fmtDate, fmtRelative, pluralize } from '../utils/format.js';
import '../components/projects/projects.css';
import '../components/tasks/tasks.css';
import '../components/dashboard/dashboard.css';

const TABS = [
  { key: 'board', label: 'Board', icon: LayoutGrid },
  { key: 'tasks', label: 'Tasks', icon: List },
  { key: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'activity', label: 'Activity', icon: ActivityIcon },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const toast = useUIStore((s) => s.toast);
  const user = useAuthStore((s) => s.user);

  const tab = window.location.pathname.split('/')[3] || 'board';
  const openTaskId = params.get('task');

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState('todo');
  const [editOpen, setEditOpen] = useState(false);

  const { data, loading, error, refetch } = useAsync(
    () => projectApi.get(projectId),
    [projectId]
  );
  const project = data?.project;

  useProjectRoom(projectId);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await taskApi.list({ project: projectId, limit: 100, sort: 'order' });
      setTasks(res.data);
    } catch (err) {
      toast({ title: 'Could not load tasks', description: err.message, tone: 'error' });
    } finally {
      setTasksLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Realtime: merge remote changes without losing local optimistic state.
  const upsert = useCallback(
    ({ task }) => {
      if (String(task.project?._id || task.project) !== String(projectId)) return;
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t._id === task._id);
        if (idx === -1) return [...prev, task];
        const next = [...prev];
        next[idx] = task;
        return next;
      });
    },
    [projectId]
  );
  useRealtime('task:created', upsert);
  useRealtime('task:updated', upsert);
  useRealtime('task:moved', upsert);
  useRealtime(
    'task:deleted',
    useCallback(({ taskId }) => setTasks((prev) => prev.filter((t) => t._id !== taskId)), [])
  );

  const members = useMemo(
    () => (project?.members || []).map((m) => m.user).filter(Boolean),
    [project]
  );

  const openTask = (task) => {
    params.set('task', task._id);
    setParams(params, { replace: true });
  };
  const closeTask = () => {
    params.delete('task');
    setParams(params, { replace: true });
  };

  /** Optimistic Kanban move with rollback and an honest error toast. */
  const move = async (task, { status, order }) => {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, status, order } : t))
    );
    try {
      const { task: updated } = await taskApi.move(task._id, { status, order });
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      if (status === 'done' && task.status !== 'done') {
        toast({ title: `“${task.title}” completed`, tone: 'success', duration: 2600 });
      }
    } catch (err) {
      setTasks(previous);
      toast({
        title: 'Move was not saved',
        description: err.message,
        tone: 'error',
      });
    }
  };

  const startCreate = (status = 'todo') => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  useEffect(() => {
    const handler = () => startCreate('todo');
    window.addEventListener('orvexa:create-task', handler);
    return () => window.removeEventListener('orvexa:create-task', handler);
  }, []);

  if (loading && !project) return <Loading label="Loading project…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load this project" />;
  if (!project) return null;

  const canManage =
    user.role === 'admin' ||
    String(project.owner?._id) === String(user._id) ||
    project.members?.some(
      (m) => String(m.user?._id) === String(user._id) && m.projectRole !== 'contributor'
    );

  return (
    <>
      <Link to="/projects" className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--sp-3)' }}>
        <ArrowLeft size={14} /> All projects
      </Link>

      <header className="wheader">
        <div style={{ minWidth: 0 }}>
          <h1 className="wheader__title">
            <span
              className="wheader__swatch"
              style={{ background: projectColor(project.color) }}
              aria-hidden="true"
            />
            <span className="truncate">{project.name}</span>
          </h1>
          <div className="row gap-2 row--wrap" style={{ marginTop: 'var(--sp-2)' }}>
            <span className={`health health--${project.health.status}`}>
              {HEALTH_LABELS[project.health.status]} · {project.health.score}
            </span>
            <span className="badge">{project.status.replace('_', ' ')}</span>
            {project.deadline && <span className="badge">Due {fmtDate(project.deadline)}</span>}
            <AvatarGroup users={members} max={5} size="xs" />
          </div>
          <p className="muted" style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--text-sm)', maxWidth: '70ch' }}>
            {project.health.reason}
          </p>
        </div>

        <div className="row gap-2">
          {canManage && (
            <button type="button" className="btn btn--secondary" onClick={() => setEditOpen(true)}>
              <Settings2 size={15} /> Settings
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={() => startCreate('todo')}>
            <Plus size={16} /> New task
          </button>
        </div>
      </header>

      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="row row--between" style={{ marginBottom: 'var(--sp-2)' }}>
          <span className="eyebrow">Completion</span>
          <span className="mono" style={{ fontSize: 'var(--text-sm)' }}>
            {project.health.totals.completed} / {project.health.totals.total} tasks ·{' '}
            {project.health.completionRate}%
          </span>
        </div>
        <ProgressBar
          value={project.health.completionRate}
          tone={project.health.status === 'healthy' ? 'primary' : project.health.status === 'at_risk' ? 'accent' : 'danger'}
          size="lg"
          label="Project completion"
        />
      </div>

      <nav className="wtabs" aria-label="Project sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <NavLink
            key={key}
            to={`/projects/${projectId}/${key}${openTaskId ? `?task=${openTaskId}` : ''}`}
            className={`wtab ${tab === key ? 'is-active' : ''}`}
          >
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </nav>

      {tasksLoading && tasks.length === 0 ? (
        <Loading label="Loading tasks…" />
      ) : (
        <>
          {tab === 'board' && (
            <KanbanBoard tasks={tasks} onOpen={openTask} onAdd={startCreate} onMove={move} />
          )}

          {tab === 'tasks' && (
            <TaskList tasks={tasks} onOpen={openTask} onCreate={() => startCreate('todo')} />
          )}

          {tab === 'timeline' && <ProjectTimeline project={project} tasks={tasks} />}

          {tab === 'team' && <TeamTab project={project} tasks={tasks} />}

          {tab === 'activity' && <ActivityTab projectId={projectId} />}

          {tab === 'analytics' && <AnalyticsTab projectId={projectId} />}
        </>
      )}

      <TaskDrawer
        taskId={openTaskId}
        open={Boolean(openTaskId)}
        members={members}
        onClose={closeTask}
        onChanged={(t) => setTasks((prev) => prev.map((x) => (x._id === t._id ? t : x)))}
        onDeleted={(id) => {
          setTasks((prev) => prev.filter((t) => t._id !== id));
          refetch();
        }}
      />

      <TaskFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        members={members}
        defaultStatus={createStatus}
        onCreated={(t) => {
          setTasks((prev) => [...prev, t]);
          refetch();
        }}
      />

      <ProjectFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        onSaved={() => refetch()}
      />
    </>
  );
}

/* ------------------------------ tabs ------------------------------ */

function TeamTab({ project, tasks }) {
  const rows = (project.members || []).map((m) => {
    const mine = tasks.filter((t) => String(t.assignee?._id) === String(m.user?._id));
    const done = mine.filter((t) => t.status === 'done').length;
    return {
      user: m.user,
      role: m.projectRole,
      total: mine.length,
      done,
      open: mine.length - done,
      percent: mine.length ? Math.round((done / mine.length) * 100) : 0,
    };
  });

  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Team ({rows.length})</h2>
      </header>
      <div className="panel__body col gap-4">
        {rows.map((r) => (
          <div key={r.user?._id} className="row gap-3">
            <Avatar user={r.user} size="md" />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row row--between gap-2">
                <span style={{ fontWeight: 600 }}>{r.user?.name}</span>
                <span className="badge" style={{ textTransform: 'capitalize' }}>
                  {r.role}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                {r.user?.jobTitle || r.user?.email} · {pluralize(r.total, 'task')} · {r.open} open
              </p>
              <div style={{ marginTop: 'var(--sp-2)' }}>
                <ProgressBar value={r.percent} size="sm" label={`${r.user?.name} completion`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityTab({ projectId }) {
  const { data, loading, error, refetch } = useAsync(
    () => systemApi.activity({ project: projectId, limit: 50 }),
    [projectId]
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const activity = data?.activity || [];

  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Activity</h2>
      </header>
      <div className="panel__body">
        {activity.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="No activity recorded yet"
            description="Every project and task change is written to an audit trail and appears here."
          />
        ) : (
          activity.map((a) => (
            <div key={a._id} className="row gap-3" style={{ padding: 'var(--sp-2) 0' }}>
              <Avatar user={a.actor} size="sm" />
              <div className="grow" style={{ minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-base)' }}>
                  <strong>{a.actor?.name}</strong>{' '}
                  <span className="muted">{a.action.replace(/[._]/g, ' ')}</span>{' '}
                  <span className="truncate">{a.entityLabel}</span>
                </p>
                <p className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                  {fmtRelative(a.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AnalyticsTab({ projectId }) {
  const { data, loading, error, refetch } = useAsync(
    () => analyticsApi.project(projectId),
    [projectId]
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { byStatus, byAssignee, series, health } = data;
  const totalTasks = byStatus.reduce((n, s) => n + s.count, 0);

  return (
    <div className="col gap-5">
      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Activity — last 30 days</h2>
        </header>
        <div className="panel__body">
          <ActivityChart data={series} />
        </div>
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <section className="panel">
          <header className="panel__head">
            <h2 className="panel__title">Tasks by status</h2>
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
                      style={{
                        width: `${totalTasks ? (s.count / totalTasks) * 100 : 0}%`,
                        background: meta.color,
                      }}
                    />
                  </span>
                  <span className="mono">{s.count}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <header className="panel__head">
            <h2 className="panel__title">Workload by member</h2>
          </header>
          <div className="panel__body dist">
            {byAssignee.length === 0 ? (
              <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                No tasks are assigned yet.
              </p>
            ) : (
              byAssignee.map((a) => (
                <div key={a._id} className="dist__row">
                  <span className="truncate muted">{a.user.name}</span>
                  <span className="dist__bar">
                    <span
                      className="dist__fill"
                      style={{
                        width: `${a.total ? (a.done / a.total) * 100 : 0}%`,
                        background: 'var(--viz-1)',
                      }}
                    />
                  </span>
                  <span className="mono">
                    {a.done}/{a.total}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Health breakdown</h2>
        </header>
        <div className="panel__body col gap-3">
          <p>{health.reason}</p>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
            {[
              ['Total', health.totals.total],
              ['Completed', health.totals.completed],
              ['Remaining', health.totals.remaining],
              ['Overdue', health.totals.overdue],
              ['Due in 7 days', health.totals.dueSoon],
              ['With dependencies', health.totals.blocked],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="tracker__stat-value tabular">{value}</p>
                <p className="tracker__stat-label">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
