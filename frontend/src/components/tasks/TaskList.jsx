import { useMemo, useState } from 'react';
import { ArrowUpDown, ListTodo, Plus } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { EmptyState } from '../ui/States.jsx';
import { statusMeta, priorityMeta, TASK_STATUSES, TASK_PRIORITIES } from '../../constants/index.js';
import { fmtDue, isOverdue } from '../../utils/format.js';
import './taskList.css';

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

export default function TaskList({ tasks, onOpen, onCreate }) {
  const [sort, setSort] = useState({ key: 'dueDate', dir: 'asc' });
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const rows = useMemo(() => {
    let out = [...tasks];
    if (statusFilter) out = out.filter((t) => t.status === statusFilter);
    if (priorityFilter) out = out.filter((t) => t.priority === priorityFilter);

    const dir = sort.dir === 'asc' ? 1 : -1;
    out.sort((a, b) => {
      switch (sort.key) {
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        case 'priority':
          return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'assignee':
          return (a.assignee?.name || '').localeCompare(b.assignee?.name || '') * dir;
        case 'dueDate':
        default: {
          // Tasks without a due date always sort last, regardless of direction.
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return (new Date(a.dueDate) - new Date(b.dueDate)) * dir;
        }
      }
    });
    return out;
  }, [tasks, sort, statusFilter, priorityFilter]);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const Th = ({ label, sortKey, width }) => (
    <th style={width ? { width } : undefined}>
      <button type="button" className="tlist__sort" onClick={() => toggleSort(sortKey)}>
        {label}
        <ArrowUpDown size={11} className={sort.key === sortKey ? 'is-active' : ''} />
      </button>
    </th>
  );

  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Tasks ({rows.length})</h2>
        <div className="row gap-2">
          <select
            className="select"
            style={{ width: 'auto', height: 30, fontSize: 'var(--text-sm)' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 'auto', height: 30, fontSize: 'var(--text-sm)' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={tasks.length === 0 ? 'No tasks yet' : 'No tasks match those filters'}
          description={
            tasks.length === 0
              ? 'Add the first task to start moving work through the board.'
              : 'Try clearing the status or priority filter.'
          }
          action={
            tasks.length === 0 && onCreate ? (
              <button type="button" className="btn btn--primary" onClick={onCreate}>
                <Plus size={15} /> New task
              </button>
            ) : null
          }
        />
      ) : (
        <div className="tlist__scroll">
          <table className="tlist">
            <thead>
              <tr>
                <Th label="Task" sortKey="title" />
                <Th label="Status" sortKey="status" width={130} />
                <Th label="Priority" sortKey="priority" width={110} />
                <Th label="Assignee" sortKey="assignee" width={170} />
                <Th label="Due" sortKey="dueDate" width={110} />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const s = statusMeta(t.status);
                const p = priorityMeta(t.priority);
                const overdue = isOverdue(t);
                return (
                  <tr key={t._id} onClick={() => onOpen(t)} tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onOpen(t)}>
                    <td>
                      <span className="tlist__title">{t.title}</span>
                      {t.labels?.length > 0 && (
                        <span className="tlist__labels">
                          {t.labels.slice(0, 2).map((l) => (
                            <span key={l} className="tcard__label">
                              {l}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge--dot" style={{ color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge--dot" style={{ color: p.color }}>
                        {p.label}
                      </span>
                    </td>
                    <td>
                      {t.assignee ? (
                        <span className="row gap-2">
                          <Avatar user={t.assignee} size="xs" />
                          <span className="truncate">{t.assignee.name}</span>
                        </span>
                      ) : (
                        <span className="subtle">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={overdue ? 'tlist__overdue' : 'muted'}>
                        {t.dueDate ? fmtDue(t.dueDate) : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
