import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInCalendarDays,
} from 'date-fns';

export const fmtDate = (d, pattern = 'd MMM yyyy') => (d ? format(new Date(d), pattern) : '—');

export const fmtDateTime = (d) => (d ? format(new Date(d), "d MMM yyyy 'at' HH:mm") : '—');

export const fmtRelative = (d) =>
  d ? `${formatDistanceToNowStrict(new Date(d), { addSuffix: true })}` : '—';

/** Human due-date label used across task cards and deadline lists. */
export function fmtDue(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  const diff = differenceInCalendarDays(date, new Date());
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff <= 6) return format(date, 'EEEE');
  return format(date, 'd MMM');
}

export const isOverdue = (task) =>
  Boolean(task?.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date());

export const fmtHours = (h) => {
  if (!h) return '0h';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${Math.round(h * 10) / 10}h`;
};

export const fmtDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

export const pluralize = (n, singular, plural = `${singular}s`) =>
  `${n} ${n === 1 ? singular : plural}`;

export const titleCase = (s = '') =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};
