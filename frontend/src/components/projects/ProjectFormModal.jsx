import { useEffect, useState } from 'react';
import { projectApi, userApi } from '../../api/endpoints.js';
import { useUIStore } from '../../store/uiStore.js';
import Modal from '../ui/Modal.jsx';
import Avatar from '../ui/Avatar.jsx';
import { PROJECT_STATUSES, PROJECT_COLORS, TASK_PRIORITIES } from '../../constants/index.js';
import './projects.css';

const EMPTY = {
  name: '',
  key: '',
  description: '',
  status: 'planning',
  priority: 'medium',
  deadline: '',
  color: 'emerald',
  tags: '',
  memberIds: [],
};

export default function ProjectFormModal({ open, onClose, project = null, onSaved }) {
  const toast = useUIStore((s) => s.toast);
  const [form, setForm] = useState(EMPTY);
  const [people, setPeople] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      project
        ? {
            name: project.name,
            key: project.key || '',
            description: project.description || '',
            status: project.status,
            priority: project.priority,
            deadline: project.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : '',
            color: project.color || 'emerald',
            tags: (project.tags || []).join(', '),
            memberIds: (project.members || []).map((m) => m.user?._id || m.user),
          }
        : EMPTY
    );
    userApi
      .list({ limit: 100 })
      .then((r) => setPeople(r.data))
      .catch(() => setPeople([]));
  }, [open, project]);

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter((m) => m !== id)
        : [...f.memberIds, id],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        key: form.key.trim().toUpperCase() || undefined,
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        deadline: form.deadline || undefined,
        color: form.color,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (!project) payload.memberIds = form.memberIds;

      const result = project
        ? await projectApi.update(project._id, payload)
        : await projectApi.create(payload);

      toast({
        title: project ? 'Project updated' : 'Project created',
        description: result.project.name,
        tone: 'success',
      });
      onSaved?.(result.project);
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
      title={project ? 'Edit project' : 'New project'}
      description={
        project
          ? 'Changes are visible to every member immediately.'
          : 'You will be the owner. Members can be added now or later.'
      }
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="project-form"
            className="btn btn--primary"
            disabled={submitting || !form.name.trim()}
          >
            {submitting ? <span className="spinner" /> : project ? 'Save changes' : 'Create project'}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="col gap-4">
        {error && (
          <div className="auth__alert" role="alert">
            {error}
          </div>
        )}

        <div className="drawer__grid">
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label className="label" htmlFor="p-name">
              Project name
            </label>
            <input
              id="p-name"
              data-autofocus
              className="input"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="p-key">
              Key
            </label>
            <input
              id="p-key"
              className="input mono"
              maxLength={8}
              placeholder="PLAT"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
            />
            <span className="field__hint">Short prefix used in lists.</span>
          </div>

          <div className="field">
            <label className="label" htmlFor="p-deadline">
              Deadline
            </label>
            <input
              id="p-deadline"
              type="date"
              className="input"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="p-status">
              Status
            </label>
            <select
              id="p-status"
              className="select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="p-priority">
              Priority
            </label>
            <select
              id="p-priority"
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
        </div>

        <div className="field">
          <label className="label" htmlFor="p-desc">
            Description
          </label>
          <textarea
            id="p-desc"
            className="textarea"
            placeholder="What is this project trying to achieve?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="p-tags">
            Tags
          </label>
          <input
            id="p-tags"
            className="input"
            placeholder="backend, q3, architecture"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
          <span className="field__hint">Comma separated.</span>
        </div>

        <fieldset className="field">
          <legend className="label">Colour</legend>
          <div className="swatches" role="radiogroup" aria-label="Project colour">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={form.color === c.value}
                aria-label={c.value}
                className={`swatch ${form.color === c.value ? 'is-active' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setForm({ ...form, color: c.value })}
              />
            ))}
          </div>
        </fieldset>

        {!project && people.length > 0 && (
          <fieldset className="field">
            <legend className="label">Team members</legend>
            <div className="member-picker">
              {people.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className={`member-chip ${form.memberIds.includes(p._id) ? 'is-active' : ''}`}
                  onClick={() => toggleMember(p._id)}
                  aria-pressed={form.memberIds.includes(p._id)}
                >
                  <Avatar user={p} size="xs" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
            <span className="field__hint">
              Selected members are notified and can see the project immediately.
            </span>
          </fieldset>
        )}
      </form>
    </Modal>
  );
}
