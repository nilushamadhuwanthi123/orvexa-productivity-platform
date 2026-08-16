import { useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, FolderKanban, Search } from 'lucide-react';
import { projectApi } from '../api/endpoints.js';
import { useAsync, useDebounced } from '../hooks/useAsync.js';
import { useAuthStore } from '../store/authStore.js';
import { ProgressBar } from '../components/ui/Progress.jsx';
import { AvatarGroup } from '../components/ui/Avatar.jsx';
import { EmptyState, ErrorState, SkeletonCard } from '../components/ui/States.jsx';
import ProjectFormModal from '../components/projects/ProjectFormModal.jsx';
import { PROJECT_STATUSES, projectColor } from '../constants/index.js';
import { fmtDue, pluralize } from '../utils/format.js';
import '../components/projects/projects.css';

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const canCreate = useAuthStore((s) => s.hasRole('admin', 'manager'));

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(params.get('new') === '1');
  const debouncedSearch = useDebounced(search, 300);

  const { data, loading, error, refetch } = useAsync(
    () => projectApi.list({ search: debouncedSearch || undefined, status: status || undefined, limit: 50 }),
    [debouncedSearch, status]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    if (params.get('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const projects = data?.data || [];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Projects</h1>
          <p className="page-head__sub">
            {loading && !data
              ? 'Loading…'
              : `${pluralize(data?.meta?.total || 0, 'project')} you can access`}
          </p>
        </div>

        {canCreate && (
          <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New project
          </button>
        )}
      </header>

      <div className="toolbar">
        <div className="topbar__search" style={{ maxWidth: 300, cursor: 'text' }}>
          <Search size={15} />
          <input
            className="cmd__input"
            style={{ fontSize: 'var(--text-sm)' }}
            placeholder="Filter projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filter projects by name"
          />
        </div>

        <select
          className="select"
          style={{ width: 'auto', minWidth: 150 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorState error={error} onRetry={refetch} title="Could not load projects" />}

      {loading && !data && (
        <div className="project-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title={search || status ? 'No projects match those filters' : 'No projects yet'}
          description={
            search || status
              ? 'Try clearing the search or status filter.'
              : canCreate
                ? 'Create your first project to start planning work and tracking progress.'
                : 'You have not been added to a project yet. Ask a manager to add you.'
          }
          action={
            canCreate && !search && !status ? (
              <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
                <Plus size={16} /> Create your first project
              </button>
            ) : null
          }
        />
      )}

      {projects.length > 0 && (
        <div className="project-grid">
          {projects.map((p) => {
            const s = p.taskStats;
            return (
              <Link
                key={p._id}
                to={`/projects/${p._id}`}
                className="project-card"
                style={{ borderTopColor: projectColor(p.color) }}
              >
                <div className="col gap-2">
                  <div className="row row--between gap-2">
                    <span className="project-card__name truncate">{p.name}</span>
                    {p.key && <span className="project-card__key">{p.key}</span>}
                  </div>
                  <div className="row gap-2 row--wrap">
                    <span className="badge">
                      {PROJECT_STATUSES.find((x) => x.value === p.status)?.label || p.status}
                    </span>
                    {p.deadline && (
                      <span className="badge" style={{ color: 'var(--text-muted)' }}>
                        Due {fmtDue(p.deadline)}
                      </span>
                    )}
                  </div>
                </div>

                {p.description && <p className="project-card__desc clamp-2">{p.description}</p>}

                <div className="col gap-2">
                  <div className="row row--between">
                    <span className="mono" style={{ fontSize: 'var(--text-lg)', fontWeight: 650 }}>
                      {s.progress}%
                    </span>
                    <span className="project-card__stats">
                      <span>{s.completed} done</span>
                      <span>{s.remaining} left</span>
                      {s.overdue > 0 && <span style={{ color: 'var(--danger)' }}>{s.overdue} overdue</span>}
                    </span>
                  </div>
                  <ProgressBar
                    value={s.progress}
                    tone={s.overdue > 0 ? 'warning' : 'primary'}
                    label={`${p.name} progress`}
                  />
                </div>

                <div className="project-card__foot">
                  <AvatarGroup users={p.members.map((m) => m.user).filter(Boolean)} max={4} size="xs" />
                  <span className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                    {pluralize(s.total, 'task')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ProjectFormModal open={modalOpen} onClose={closeModal} onSaved={() => refetch()} />
    </>
  );
}
