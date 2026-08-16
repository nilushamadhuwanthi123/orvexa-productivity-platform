import { useState } from 'react';
import { ShieldCheck, Server, Database, Radio, Trash2 } from 'lucide-react';
import { systemApi, userApi } from '../api/endpoints.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import Avatar from '../components/ui/Avatar.jsx';
import { Loading, ErrorState } from '../components/ui/States.jsx';
import { ROLE_LABELS } from '../constants/index.js';
import { fmtRelative } from '../utils/format.js';
import './team.css';
import '../components/dashboard/dashboard.css';

export default function Admin() {
  const me = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [busy, setBusy] = useState(null);

  const { data, loading, error, refetch } = useAsync(
    () =>
      Promise.all([
        systemApi.adminOverview(),
        userApi.list({ limit: 100 }),
        systemApi.health().catch((e) => ({ status: 'degraded', error: e.message })),
      ]),
    []
  );

  if (loading && !data) return <Loading label="Loading admin overview…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load the admin panel" />;

  const [overview, usersRes, health] = data;
  const users = usersRes.data;

  const changeRole = async (user, role) => {
    setBusy(user._id);
    try {
      await userApi.updateRole(user._id, role);
      toast({ title: `${user.name} is now ${ROLE_LABELS[role]}`, tone: 'success' });
      refetch();
    } catch (err) {
      toast({ title: 'Role not changed', description: err.message, tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const removeUser = async (user) => {
    setBusy(user._id);
    try {
      await userApi.remove(user._id);
      toast({
        title: `${user.name} removed`,
        description: 'Their tasks were unassigned rather than deleted.',
        tone: 'success',
      });
      refetch();
    } catch (err) {
      toast({ title: 'User not removed', description: err.message, tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const healthy = health?.status === 'ok';

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-head__title">
            <ShieldCheck size={22} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--primary)' }} />
            Admin
          </h1>
          <p className="page-head__sub">Workspace-wide users, activity and system health.</p>
        </div>
      </header>

      <div className="dash__kpis">
        <Stat label="Users" value={overview.stats.users} />
        <Stat label="Active (7 days)" value={overview.stats.activeUsers} tone="var(--viz-1)" />
        <Stat label="Projects" value={overview.stats.projects} />
        <Stat label="Tasks" value={overview.stats.tasks} />
        <Stat label="Completion rate" value={`${overview.stats.completionRate}%`} tone="var(--viz-2)" />
      </div>

      <section className="panel" style={{ marginBottom: 'var(--sp-5)' }}>
        <header className="panel__head">
          <h2 className="panel__title">System health</h2>
          <span className={`health health--${healthy ? 'healthy' : 'at_risk'}`}>
            {healthy ? 'All systems normal' : 'Degraded'}
          </span>
        </header>
        <div className="panel__body">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <HealthItem
              icon={Server}
              label="API"
              status={health?.api?.status}
              detail={health?.uptimeSeconds ? `up ${Math.round(health.uptimeSeconds / 60)} min` : ''}
            />
            <HealthItem
              icon={Database}
              label="Database"
              status={health?.database?.status}
              detail={health?.database?.name || ''}
            />
            <HealthItem
              icon={Radio}
              label="Realtime"
              status={health?.realtime?.status}
              detail={
                health?.realtime
                  ? `${health.realtime.onlineUsers} online · ${health.realtime.connections} sockets`
                  : ''
              }
            />
          </div>
          <p className="subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--sp-4)' }}>
            Read live from <code className="mono">/api/health</code>. AI assistant:{' '}
            {health?.features?.aiAssistant ? 'configured' : 'not configured — feature disabled'}.
          </p>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 'var(--sp-5)' }}>
        <header className="panel__head">
          <h2 className="panel__title">Users ({users.length})</h2>
        </header>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Person</th>
                <th style={{ width: 160 }}>Role</th>
                <th style={{ width: 140 }}>Last active</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <span className="row gap-3">
                      <Avatar user={u} size="sm" online={u.isOnline} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 550 }}>{u.name}</span>
                        <span className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                          {u.email}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <select
                      className="select"
                      style={{ height: 30, fontSize: 'var(--text-sm)' }}
                      value={u.role}
                      disabled={busy === u._id || String(u._id) === String(me._id)}
                      onChange={(e) => changeRole(u, e.target.value)}
                      aria-label={`Role for ${u.name}`}
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    {fmtRelative(u.lastActiveAt)}
                  </td>
                  <td>
                    {String(u._id) !== String(me._id) && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={() => removeUser(u)}
                        disabled={busy === u._id}
                        aria-label={`Remove ${u.name}`}
                        title="Remove user"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Audit log</h2>
          <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            Most recent {overview.recentActivity.length} events
          </span>
        </header>
        <div className="panel__body">
          {overview.recentActivity.map((a) => (
            <div key={a._id} className="row gap-3" style={{ padding: 'var(--sp-2) 0' }}>
              <Avatar user={a.actor} size="xs" />
              <span className="grow truncate" style={{ fontSize: 'var(--text-sm)' }}>
                <strong>{a.actor?.name}</strong>{' '}
                <span className="muted">{a.action.replace(/[._]/g, ' ')}</span> {a.entityLabel}
                {a.project && <span className="subtle"> · {a.project.name}</span>}
              </span>
              <span className="subtle" style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                {fmtRelative(a.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="kpi">
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
      </div>
      <div className="kpi__value tabular" style={{ color: tone }}>
        {value}
      </div>
      <div className="kpi__foot" />
    </div>
  );
}

function HealthItem({ icon: Icon, label, status, detail }) {
  const ok = status === 'ok';
  return (
    <div className="row gap-3">
      <span
        className="kpi__icon"
        style={{
          color: ok ? 'var(--primary)' : 'var(--danger)',
          background: ok ? 'var(--primary-soft)' : 'var(--danger-soft)',
        }}
      >
        <Icon size={15} />
      </span>
      <div>
        <p style={{ fontWeight: 600 }}>{label}</p>
        <p
          className="health-dot"
          style={{ color: ok ? 'var(--primary)' : 'var(--danger)' }}
        >
          {status || 'unknown'}
          {detail && <span className="subtle"> · {detail}</span>}
        </p>
      </div>
    </div>
  );
}
