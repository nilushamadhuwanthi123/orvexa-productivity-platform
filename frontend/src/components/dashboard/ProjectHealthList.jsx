import { Link } from 'react-router-dom';
import { FolderKanban, ArrowUpRight } from 'lucide-react';
import { ProgressBar } from '../ui/Progress.jsx';
import { AvatarGroup } from '../ui/Avatar.jsx';
import { EmptyState } from '../ui/States.jsx';
import { projectColor, HEALTH_LABELS } from '../../constants/index.js';
import { fmtDue } from '../../utils/format.js';
import './dashboard.css';

export default function ProjectHealthList({ projects = [] }) {
  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Project progress</h2>
        <Link to="/projects" className="btn btn--ghost btn--sm">
          All projects <ArrowUpRight size={13} />
        </Link>
      </header>

      <div className="panel__body col gap-3">
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No active projects"
            description="Create a project to start tracking progress and health."
            action={
              <Link to="/projects?new=1" className="btn btn--primary">
                Create your first project
              </Link>
            }
          />
        ) : (
          projects.map((p) => {
            const h = p.health;
            const tone =
              h.status === 'healthy' ? 'primary' : h.status === 'at_risk' ? 'accent' : 'danger';

            return (
              <Link key={p._id} to={`/projects/${p._id}`} className="pcard">
                <div className="row row--between gap-3">
                  <div className="row gap-2 grow" style={{ minWidth: 0 }}>
                    <span
                      className="pcard__swatch"
                      style={{ background: projectColor(p.color) }}
                      aria-hidden="true"
                    />
                    <span className="pcard__name truncate">{p.name}</span>
                  </div>
                  <span className={`health health--${h.status}`}>{HEALTH_LABELS[h.status]}</span>
                </div>

                <div className="row row--between gap-3">
                  <span className="pcard__pct tabular">{h.completionRate}%</span>
                  <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {h.totals.completed} of {h.totals.total} tasks
                    {p.deadline && ` · due ${fmtDue(p.deadline)}`}
                  </span>
                </div>

                <ProgressBar value={h.completionRate} tone={tone} label={`${p.name} progress`} />

                <p className="pcard__reason">{h.reason}</p>

                {p.members?.length > 0 && (
                  <AvatarGroup users={p.members.map((m) => m.user).filter(Boolean)} max={5} size="xs" />
                )}
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
