import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { userApi } from '../api/endpoints.js';
import { useAsync, useDebounced } from '../hooks/useAsync.js';
import Avatar from '../components/ui/Avatar.jsx';
import { ProgressBar } from '../components/ui/Progress.jsx';
import { Loading, ErrorState, EmptyState } from '../components/ui/States.jsx';
import { ROLE_LABELS } from '../constants/index.js';
import { pluralize } from '../utils/format.js';
import './team.css';

export default function Team() {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);

  const { data, loading, error, refetch } = useAsync(
    () => Promise.all([userApi.list({ search: debounced || undefined, limit: 100 }), userApi.workload()]),
    [debounced]
  );

  if (loading && !data) return <Loading label="Loading the team…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load the team" />;

  const [usersRes, workloadRes] = data;
  const users = usersRes.data;
  const workloadByUser = new Map(workloadRes.workload.map((w) => [String(w.user._id), w]));

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Team</h1>
          <p className="page-head__sub">
            {pluralize(usersRes.meta.total, 'person', 'people')} in this workspace
          </p>
        </div>

        <div className="topbar__search" style={{ maxWidth: 280, cursor: 'text' }}>
          <Search size={15} />
          <input
            className="cmd__input"
            style={{ fontSize: 'var(--text-sm)' }}
            placeholder="Find someone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search people"
          />
        </div>
      </header>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No one matches that search"
          description="Try a different name, email or job title."
        />
      ) : (
        <div className="team-grid">
          {users.map((u) => {
            const w = workloadByUser.get(String(u._id));
            return (
              <article key={u._id} className="team-card">
                <div className="row gap-3">
                  <Avatar user={u} size="lg" online={u.isOnline} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <p className="team-card__name truncate">{u.name}</p>
                    <p className="muted truncate" style={{ fontSize: 'var(--text-sm)' }}>
                      {u.jobTitle || 'No job title set'}
                    </p>
                    <div className="row gap-2" style={{ marginTop: 'var(--sp-2)' }}>
                      <span className="badge">{ROLE_LABELS[u.role]}</span>
                      {u.department && <span className="badge">{u.department}</span>}
                    </div>
                  </div>
                </div>

                {u.bio && <p className="team-card__bio clamp-2">{u.bio}</p>}

                {u.skills?.length > 0 && (
                  <div className="row gap-1 row--wrap">
                    {u.skills.slice(0, 5).map((s) => (
                      <span key={s} className="tcard__label">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="team-card__work">
                  {w ? (
                    <>
                      <div className="row row--between" style={{ marginBottom: 'var(--sp-2)' }}>
                        <span className="eyebrow">Workload</span>
                        <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                          {w.completed}/{w.total} complete
                        </span>
                      </div>
                      <ProgressBar
                        value={w.completionRate}
                        tone={w.overdue > 0 ? 'warning' : 'primary'}
                        size="sm"
                        label={`${u.name} completion`}
                      />
                      <div className="team-card__stats">
                        <span>{w.open} open</span>
                        <span>{w.inProgress} in progress</span>
                        {w.overdue > 0 && <span style={{ color: 'var(--danger)' }}>{w.overdue} overdue</span>}
                      </div>
                    </>
                  ) : (
                    <p className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                      No tasks assigned in projects you can see.
                    </p>
                  )}
                </div>

                <p className="subtle team-card__foot">
                  {u.isOnline ? 'Online now' : `Availability: ${u.availability}`}
                  {u.location && ` · ${u.location}`}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <p className="subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--sp-6)', maxWidth: '70ch' }}>
        Workload figures come from tasks in projects you have access to. Orvexa deliberately does not rank
        people against each other or produce individual productivity scores.
      </p>
    </>
  );
}
