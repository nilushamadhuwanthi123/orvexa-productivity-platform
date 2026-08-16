import { useEffect, useState, useCallback } from 'react';
import { Check, Plus, Trash2, Send, Play, Square, Link2 } from 'lucide-react';
import { taskApi, commentApi, timeApi } from '../../api/endpoints.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useRealtime } from '../../hooks/useSocket.js';
import Modal from '../ui/Modal.jsx';
import Avatar from '../ui/Avatar.jsx';
import { ProgressBar } from '../ui/Progress.jsx';
import { Loading } from '../ui/States.jsx';
import { TASK_STATUSES, TASK_PRIORITIES, statusMeta } from '../../constants/index.js';
import { fmtRelative, fmtDate, fmtHours } from '../../utils/format.js';
import './tasks.css';

export default function TaskDrawer({ taskId, members = [], open, onClose, onChanged, onDeleted }) {
  const me = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [newItem, setNewItem] = useState('');
  const [timer, setTimer] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [{ task: t }, { comments: c }, { entry }] = await Promise.all([
        taskApi.get(taskId).then((r) => r),
        taskApi.comments(taskId).then((r) => r),
        timeApi.running().catch(() => ({ entry: null })),
      ]);
      setTask(t);
      setComments(c);
      setTimer(entry);
    } catch (err) {
      toast({ title: 'Could not load this task', description: err.message, tone: 'error' });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [taskId, toast, onClose]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useRealtime(
    'comment:created',
    useCallback(
      ({ comment, taskId: tid }) => {
        if (String(tid || comment.task) !== String(taskId)) return;
        setComments((prev) =>
          prev.some((c) => c._id === comment._id) ? prev : [...prev, comment]
        );
      },
      [taskId]
    )
  );

  const patch = async (updates) => {
    const previous = task;
    setTask({ ...task, ...updates });
    setSaving(true);
    try {
      const { task: updated } = await taskApi.update(taskId, updates);
      setTask(updated);
      onChanged?.(updated);
    } catch (err) {
      setTask(previous);
      toast({ title: 'Change was not saved', description: err.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (itemId) => {
    const previous = task;
    setTask({
      ...task,
      checklist: task.checklist.map((c) => (c._id === itemId ? { ...c, done: !c.done } : c)),
    });
    try {
      const { task: updated } = await taskApi.toggleChecklistItem(taskId, itemId);
      setTask(updated);
      onChanged?.(updated);
    } catch (err) {
      setTask(previous);
      toast({ title: 'Checklist not updated', description: err.message, tone: 'error' });
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    const text = newItem.trim();
    setNewItem('');
    try {
      const { task: updated } = await taskApi.addChecklistItem(taskId, text);
      setTask(updated);
      onChanged?.(updated);
    } catch (err) {
      setNewItem(text);
      toast({ title: 'Item not added', description: err.message, tone: 'error' });
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft.trim();
    setDraft('');
    try {
      const { comment } = await taskApi.addComment(taskId, { body });
      setComments((prev) => (prev.some((c) => c._id === comment._id) ? prev : [...prev, comment]));
      setTask((t) => ({ ...t, commentCount: (t.commentCount || 0) + 1 }));
    } catch (err) {
      setDraft(body);
      toast({ title: 'Comment not posted', description: err.message, tone: 'error' });
    }
  };

  const deleteComment = async (id) => {
    const previous = comments;
    setComments((c) => c.filter((x) => x._id !== id));
    try {
      await commentApi.remove(id);
    } catch (err) {
      setComments(previous);
      toast({ title: 'Comment not deleted', description: err.message, tone: 'error' });
    }
  };

  const deleteTask = async () => {
    const id = taskId;
    try {
      await taskApi.remove(id);
      toast({ title: 'Task deleted', tone: 'success' });
      onDeleted?.(id);
      onClose();
    } catch (err) {
      toast({ title: 'Task not deleted', description: err.message, tone: 'error' });
    }
  };

  const toggleTimer = async () => {
    try {
      if (timer && String(timer.task?._id || timer.task) === String(taskId)) {
        await timeApi.stop();
        setTimer(null);
        toast({ title: 'Timer stopped', tone: 'success' });
        load();
      } else {
        const { entry } = await timeApi.start(taskId);
        setTimer(entry);
        toast({ title: 'Timer started', tone: 'success' });
      }
    } catch (err) {
      toast({ title: 'Timer not updated', description: err.message, tone: 'error' });
    }
  };

  const timerRunningHere = timer && String(timer.task?._id || timer.task) === String(taskId);
  const checked = task?.checklist?.filter((c) => c.done).length || 0;
  const totalItems = task?.checklist?.length || 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="drawer"
      size="lg"
      title={loading ? 'Loading…' : task?.title}
      description={task ? `${task.project?.name} · reported by ${task.reporter?.name}` : undefined}
      footer={
        task && (
          <>
            <button type="button" className="btn btn--danger btn--sm" onClick={deleteTask}>
              <Trash2 size={14} /> Delete
            </button>
            <span className="grow" />
            {saving && <span className="subtle" style={{ fontSize: 'var(--text-xs)' }}>Saving…</span>}
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Close
            </button>
          </>
        )
      }
    >
      {loading || !task ? (
        <Loading label="Loading task…" />
      ) : (
        <>
          <div className="drawer__grid">
            <div>
              <span className="drawer__label">Status</span>
              <select
                className="select"
                value={task.status}
                onChange={(e) => patch({ status: e.target.value })}
                aria-label="Status"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="drawer__label">Priority</span>
              <select
                className="select"
                value={task.priority}
                onChange={(e) => patch({ priority: e.target.value })}
                aria-label="Priority"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="drawer__label">Assignee</span>
              <select
                className="select"
                value={task.assignee?._id || ''}
                onChange={(e) => patch({ assignee: e.target.value || null })}
                aria-label="Assignee"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="drawer__label">Due date</span>
              <input
                type="date"
                className="input"
                value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''}
                onChange={(e) => patch({ dueDate: e.target.value || null })}
                aria-label="Due date"
              />
            </div>
          </div>

          <div className="drawer__section">
            <span className="drawer__label">Description</span>
            <textarea
              className="textarea"
              defaultValue={task.description}
              placeholder="Add context, acceptance criteria, links…"
              onBlur={(e) => {
                if (e.target.value !== task.description) patch({ description: e.target.value });
              }}
              aria-label="Description"
            />
          </div>

          {task.dependsOn?.length > 0 && (
            <div className="drawer__section">
              <span className="drawer__label">Depends on</span>
              <div className="col gap-2">
                {task.dependsOn.map((d) => (
                  <div key={d._id} className="row gap-2">
                    <Link2 size={14} className="muted" />
                    <span className="grow truncate">{d.title}</span>
                    <span className="badge" style={{ color: statusMeta(d.status).color }}>
                      {statusMeta(d.status).label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="drawer__section">
            <div className="row row--between" style={{ marginBottom: 'var(--sp-2)' }}>
              <span className="drawer__label" style={{ margin: 0 }}>
                Checklist {totalItems > 0 && `— ${checked} / ${totalItems} completed`}
              </span>
            </div>

            {totalItems > 0 && (
              <ProgressBar
                value={(checked / totalItems) * 100}
                size="sm"
                label="Checklist progress"
              />
            )}

            <div className="col" style={{ marginTop: 'var(--sp-2)' }}>
              {task.checklist.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={`check ${item.done ? 'is-done' : ''}`}
                  onClick={() => toggleItem(item._id)}
                  aria-pressed={item.done}
                >
                  <span className="check__box">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="check__text">{item.text}</span>
                </button>
              ))}
            </div>

            <form onSubmit={addItem} className="row gap-2" style={{ marginTop: 'var(--sp-2)' }}>
              <input
                className="input"
                placeholder="Add a checklist item…"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                aria-label="New checklist item"
              />
              <button type="submit" className="btn btn--secondary btn--icon" disabled={!newItem.trim()} aria-label="Add item">
                <Plus size={15} />
              </button>
            </form>
          </div>

          <div className="drawer__section">
            <span className="drawer__label">Time</span>
            <div className="row gap-3 row--wrap">
              <button
                type="button"
                className={`btn ${timerRunningHere ? 'btn--danger' : 'btn--secondary'}`}
                onClick={toggleTimer}
                disabled={timer && !timerRunningHere}
                title={
                  timer && !timerRunningHere
                    ? 'A timer is already running on another task'
                    : undefined
                }
              >
                {timerRunningHere ? (
                  <>
                    <Square size={14} /> Stop timer
                  </>
                ) : (
                  <>
                    <Play size={14} /> Start timer
                  </>
                )}
              </button>
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                Estimated {fmtHours(task.estimatedHours)} · Logged {fmtHours(task.actualHours)}
              </span>
            </div>
            {timer && !timerRunningHere && (
              <p className="field__hint" style={{ marginTop: 'var(--sp-2)' }}>
                A timer is running on “{timer.task?.title}”. Stop it before starting another.
              </p>
            )}
          </div>

          <div className="drawer__section">
            <span className="drawer__label">
              Comments {comments.length > 0 && `(${comments.length})`}
            </span>

            {comments.length === 0 && (
              <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                No comments yet. Start the conversation below.
              </p>
            )}

            {comments.map((c) => (
              <article key={c._id} className="comment">
                <Avatar user={c.author} size="sm" />
                <div className="grow">
                  <div className="comment__head">
                    <span className="comment__author">{c.author?.name}</span>
                    <span className="comment__time">
                      {fmtRelative(c.createdAt)}
                      {c.editedAt && ' · edited'}
                    </span>
                  </div>
                  <p className="comment__body">{c.body}</p>
                  {String(c.author?._id) === String(me._id) && (
                    <div className="comment__actions">
                      <button
                        type="button"
                        className="comment__action"
                        onClick={() => deleteComment(c._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}

            <form onSubmit={submitComment} className="row gap-2" style={{ marginTop: 'var(--sp-3)' }}>
              <Avatar user={me} size="sm" />
              <input
                className="input"
                placeholder="Write a comment…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="New comment"
              />
              <button
                type="submit"
                className="btn btn--primary btn--icon"
                disabled={!draft.trim()}
                aria-label="Post comment"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

          <p className="subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--sp-5)' }}>
            Created {fmtDate(task.createdAt)} · Last updated {fmtRelative(task.updatedAt)}
          </p>
        </>
      )}
    </Modal>
  );
}
