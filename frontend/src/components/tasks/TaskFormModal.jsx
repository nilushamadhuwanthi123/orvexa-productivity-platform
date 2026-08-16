import { useEffect, useState } from 'react';
import { taskApi } from '../../api/endpoints.js';
import { useUIStore } from '../../store/uiStore.js';
import Modal from '../ui/Modal.jsx';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../constants/index.js';

const EMPTY = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignee: '',
  dueDate: '',
  estimatedHours: '',
};

export default function TaskFormModal({ open, onClose, projectId, members = [], defaultStatus, onCreated }) {
  const toast = useUIStore((s) => s.toast);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, status: defaultStatus || 'todo' });
      setError(null);
    }
  }, [open, defaultStatus]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        project: projectId,
        status: form.status,
        priority: form.priority,
        assignee: form.assignee || undefined,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      };
      const { task } = await taskApi.create(payload);
      toast({ title: 'Task created', description: task.title, tone: 'success' });
      onCreated?.(task);
      onClose();
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      description="Tasks belong to a project and appear on its board immediately."
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            className="btn btn--primary"
            disabled={submitting || !form.title.trim()}
          >
            {submitting ? <span className="spinner" /> : 'Create task'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="col gap-4">
        {error && (
          <div className="auth__alert" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="t-title">
            Title
          </label>
          <input
            id="t-title"
            data-autofocus
            className="input"
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="t-desc">
            Description
          </label>
          <textarea
            id="t-desc"
            className="textarea"
            placeholder="What does done look like?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="drawer__grid">
          <div className="field">
            <label className="label" htmlFor="t-status">
              Status
            </label>
            <select
              id="t-status"
              className="select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="t-priority">
              Priority
            </label>
            <select
              id="t-priority"
              className="select"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="t-assignee">
              Assignee
            </label>
            <select
              id="t-assignee"
              className="select"
              value={form.assignee}
              onChange={(e) => setForm({ ...form, assignee: e.target.value })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="t-due">
              Due date
            </label>
            <input
              id="t-due"
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="t-est">
            Estimated hours
          </label>
          <input
            id="t-est"
            type="number"
            min="0"
            max="1000"
            step="0.5"
            className="input"
            value={form.estimatedHours}
            onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
          />
          <span className="field__hint">Used alongside tracked time in analytics.</span>
        </div>
      </form>
    </Modal>
  );
}
