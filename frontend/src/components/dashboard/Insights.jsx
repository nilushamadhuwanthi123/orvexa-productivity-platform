import { Sparkles, TrendingUp, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { EmptyState } from '../ui/States.jsx';
import './dashboard.css';

const ICONS = {
  positive: TrendingUp,
  warning: AlertTriangle,
  critical: AlertOctagon,
  info: Info,
};

/**
 * Insights are generated server-side from aggregates. If the data does not
 * support a claim the server sends nothing, so this list is either real or
 * empty — it never fills space with a generic message.
 */
export default function Insights({ insights = [] }) {
  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">
          <Sparkles size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent)' }} />
          Smart insights
        </h2>
      </header>

      <div className="panel__body">
        {insights.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Not enough activity yet"
            description="Insights appear once there is enough completed work to draw a conclusion from. Nothing is shown until then."
          />
        ) : (
          <div className="insights">
            {insights.map((i, idx) => {
              const Icon = ICONS[i.tone] || Info;
              return (
                <div key={idx} className={`insight insight--${i.tone}`}>
                  <Icon size={15} className="insight__icon" />
                  <span>{i.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
