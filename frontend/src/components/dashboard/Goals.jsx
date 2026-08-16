import { Target, Plus } from 'lucide-react';
import { ProgressBar } from '../ui/Progress.jsx';
import { EmptyState } from '../ui/States.jsx';
import { fmtDue } from '../../utils/format.js';
import './dashboard.css';

export default function Goals({ goals = [], onCreate }) {
  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Goals</h2>
        {onCreate && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCreate}>
            <Plus size={14} /> New goal
          </button>
        )}
      </header>

      <div className="panel__body">
        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals set"
            description="Goals track real completed tasks, so progress updates itself as you work."
            action={
              onCreate && (
                <button type="button" className="btn btn--primary" onClick={onCreate}>
                  Create a goal
                </button>
              )
            }
          />
        ) : (
          goals.map((g) => {
            const percent = Math.min(100, Math.round(((g.current || 0) / g.target) * 100));
            const tone = percent >= 100 ? 'primary' : percent >= 50 ? 'accent' : 'warning';

            return (
              <div key={g._id} className="goal">
                <div className="row row--between gap-3" style={{ marginBottom: 'var(--sp-2)' }}>
                  <span className="goal__title truncate">{g.title}</span>
                  <span className="goal__figures">
                    {g.metric === 'task_count' ? `${g.current || 0} / ${g.target}` : `${percent}%`}
                  </span>
                </div>

                <ProgressBar value={percent} tone={tone} size="sm" label={g.title} />

                <p className="subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--sp-2)' }}>
                  {g.deadline ? `Due ${fmtDue(g.deadline)}` : 'No deadline'}
                  {percent < 100 &&
                    g.metric === 'task_count' &&
                    ` · ${g.target - (g.current || 0)} to go`}
                  {percent >= 100 && ' · achieved'}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
