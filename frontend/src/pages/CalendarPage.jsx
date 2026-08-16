import { useCallback, useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  addWeeks,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { taskApi } from '../api/endpoints.js';
import { useAsync } from '../hooks/useAsync.js';
import { useUIStore } from '../store/uiStore.js';
import TaskDrawer from '../components/tasks/TaskDrawer.jsx';
import { ErrorState, Loading, EmptyState } from '../components/ui/States.jsx';
import { priorityMeta, projectColor } from '../constants/index.js';
import { isOverdue } from '../utils/format.js';
import './calendar.css';

const VIEWS = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
];

export default function CalendarPage() {
  const toast = useUIStore((s) => s.toast);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState('month');
  const [openId, setOpenId] = useState(null);
  const [dragging, setDragging] = useState(null);

  const { data, loading, error, refetch, setData } = useAsync(
    () => taskApi.list({ limit: 300 }),
    []
  );

  const tasks = useMemo(() => (data?.data || []).filter((t) => t.dueDate), [data]);

  const days = useMemo(() => {
    if (view === 'day') return [cursor];
    const from = view === 'month' ? startOfWeek(startOfMonth(cursor)) : startOfWeek(cursor);
    const to = view === 'month' ? endOfWeek(endOfMonth(cursor)) : endOfWeek(cursor);
    return eachDayOfInterval({ start: from, end: to });
  }, [cursor, view]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const key = format(new Date(t.dueDate), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  }, [tasks]);

  const shift = (dir) => {
    if (view === 'month') setCursor((c) => addMonths(c, dir));
    else if (view === 'week') setCursor((c) => addWeeks(c, dir));
    else setCursor((c) => addDays(c, dir));
  };

  /** Drag a task onto a day to reschedule it; rolls back if the save fails. */
  const drop = useCallback(
    async (day) => {
      if (!dragging) return;
      const task = dragging;
      setDragging(null);

      const newDate = new Date(day);
      newDate.setHours(12, 0, 0, 0);
      if (isSameDay(new Date(task.dueDate), newDate)) return;

      const previous = data;
      setData({
        ...data,
        data: data.data.map((t) => (t._id === task._id ? { ...t, dueDate: newDate.toISOString() } : t)),
      });

      try {
        await taskApi.update(task._id, { dueDate: newDate.toISOString() });
        toast({
          title: 'Due date updated',
          description: `${task.title} → ${format(newDate, 'd MMM yyyy')}`,
          tone: 'success',
        });
      } catch (err) {
        setData(previous);
        toast({ title: 'Due date not saved', description: err.message, tone: 'error' });
      }
    },
    [dragging, data, setData, toast]
  );

  if (loading && !data) return <Loading label="Loading calendar…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load the calendar" />;

  const title =
    view === 'day'
      ? format(cursor, 'EEEE, d MMMM yyyy')
      : view === 'week'
        ? `${format(startOfWeek(cursor), 'd MMM')} – ${format(endOfWeek(cursor), 'd MMM yyyy')}`
        : format(cursor, 'MMMM yyyy');

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Calendar</h1>
          <p className="page-head__sub">
            Task deadlines across your projects. Drag a task to a different day to reschedule it.
          </p>
        </div>

        <div className="row gap-2">
          <div className="segmented">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                className={`segmented__item ${view === v.key ? 'is-active' : ''}`}
                onClick={() => setView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setCursor(new Date())}>
            Today
          </button>
        </div>
      </header>

      <div className="cal__bar">
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => shift(-1)} aria-label="Previous">
          <ChevronLeft size={16} />
        </button>
        <h2 className="cal__title">{title}</h2>
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => shift(1)} aria-label="Next">
          <ChevronRight size={16} />
        </button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No tasks with due dates"
          description="Give a task a due date and it will appear on this calendar."
        />
      ) : (
        <div className={`cal cal--${view}`}>
          {view !== 'day' && (
            <div className="cal__weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          )}

          <div className="cal__grid">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const items = byDay.get(key) || [];
              const outside = view === 'month' && !isSameMonth(day, cursor);

              return (
                <div
                  key={key}
                  className={`cal__day ${outside ? 'is-outside' : ''} ${isToday(day) ? 'is-today' : ''} ${
                    dragging ? 'is-droppable' : ''
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => drop(day)}
                >
                  <div className="cal__daynum">
                    <span>{format(day, view === 'day' ? 'EEEE d MMMM' : 'd')}</span>
                    {items.length > 0 && <span className="cal__count">{items.length}</span>}
                  </div>

                  <div className="cal__events">
                    {items.map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        draggable
                        onDragStart={() => setDragging(t)}
                        onDragEnd={() => setDragging(null)}
                        className={`cal__event ${isOverdue(t) ? 'is-overdue' : ''} ${t.status === 'done' ? 'is-done' : ''}`}
                        onClick={() => setOpenId(t._id)}
                        title={`${t.title} — ${t.project?.name}`}
                      >
                        <span
                          className="cal__event-dot"
                          style={{ background: t.status === 'done' ? 'var(--primary)' : priorityMeta(t.priority).color }}
                        />
                        <span className="truncate">{t.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TaskDrawer
        taskId={openId}
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        onChanged={() => refetch()}
        onDeleted={() => refetch()}
      />
    </>
  );
}
