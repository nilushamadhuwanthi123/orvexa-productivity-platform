export const TASK_STATUSES = [
  { value: 'backlog', label: 'Backlog', color: 'var(--status-backlog)' },
  { value: 'todo', label: 'Todo', color: 'var(--status-todo)' },
  { value: 'in_progress', label: 'In Progress', color: 'var(--status-in_progress)' },
  { value: 'in_review', label: 'In Review', color: 'var(--status-in_review)' },
  { value: 'done', label: 'Done', color: 'var(--status-done)' },
];

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'var(--priority-low)' },
  { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { value: 'high', label: 'High', color: 'var(--priority-high)' },
  { value: 'critical', label: 'Critical', color: 'var(--priority-critical)' },
];

export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export const PROJECT_COLORS = [
  { value: 'emerald', hex: 'var(--viz-1)' },
  { value: 'champagne', hex: 'var(--viz-2)' },
  { value: 'sage', hex: 'var(--viz-3)' },
  { value: 'cobalt', hex: 'var(--viz-a-1)' },
  { value: 'lime', hex: 'var(--viz-a-2)' },
  { value: 'teal', hex: 'var(--viz-b-3)' },
  { value: 'burgundy', hex: 'var(--viz-b-1)' },
  { value: 'arctic', hex: 'var(--viz-c-1)' },
];

export const projectColor = (name) =>
  PROJECT_COLORS.find((c) => c.value === name)?.hex || 'var(--viz-1)';

export const statusMeta = (value) =>
  TASK_STATUSES.find((s) => s.value === value) || TASK_STATUSES[1];

export const priorityMeta = (value) =>
  TASK_PRIORITIES.find((p) => p.value === value) || TASK_PRIORITIES[1];

export const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
};

export const HEALTH_LABELS = {
  healthy: 'Healthy',
  at_risk: 'At risk',
  critical: 'Critical',
};

/** Chart palettes, keyed to the CSS variables in tokens.css. */
export const VIZ = {
  brand: ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)', 'var(--viz-6)'],
  technical: ['var(--viz-a-1)', 'var(--viz-a-2)', 'var(--viz-a-3)', 'var(--viz-a-4)', 'var(--viz-a-5)', 'var(--viz-a-6)'],
  creative: ['var(--viz-b-1)', 'var(--viz-b-2)', 'var(--viz-b-3)', 'var(--viz-b-4)', 'var(--viz-b-5)', 'var(--viz-b-6)'],
  realtime: ['var(--viz-c-1)', 'var(--viz-c-2)', 'var(--viz-c-3)', 'var(--viz-c-4)', 'var(--viz-c-5)', 'var(--viz-c-6)'],
};
