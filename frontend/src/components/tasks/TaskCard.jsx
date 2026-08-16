import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, CheckSquare, Paperclip, Link2, Clock } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { priorityMeta } from '../../constants/index.js';
import { fmtDue, isOverdue } from '../../utils/format.js';
import './tasks.css';

export function TaskCardBody({ task, onOpen, dragging }) {
  const overdue = isOverdue(task);
  const priority = priorityMeta(task.priority);
  const checklist = task.checklist || [];
  const checked = checklist.filter((c) => c.done).length;
  const blocked = (task.dependsOn || []).some((d) => d.status && d.status !== 'done');

  return (
    <button
      type="button"
      className={`tcard ${dragging ? 'is-dragging' : ''} ${overdue ? 'is-overdue' : ''}`}
      onClick={onOpen}
      aria-label={`Open task ${task.title}`}
    >
      <span className="tcard__priority" style={{ background: priority.color }} aria-hidden="true" />

      <span className="tcard__title">{task.title}</span>

      {blocked && (
        <span className="tcard__blocked">
          <Link2 size={11} /> Blocked by {task.dependsOn.find((d) => d.status !== 'done')?.title}
        </span>
      )}

      {task.labels?.length > 0 && (
        <span className="tcard__labels">
          {task.labels.slice(0, 3).map((l) => (
            <span key={l} className="tcard__label">
              {l}
            </span>
          ))}
        </span>
      )}

      <span className="tcard__foot">
        <span className="tcard__meta">
          {task.dueDate && (
            <span className={`tcard__due ${overdue ? 'is-overdue' : ''}`}>
              <Clock size={11} /> {fmtDue(task.dueDate)}
            </span>
          )}
          {checklist.length > 0 && (
            <span className="tcard__chip">
              <CheckSquare size={11} /> {checked}/{checklist.length}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="tcard__chip">
              <MessageSquare size={11} /> {task.commentCount}
            </span>
          )}
          {task.attachments?.length > 0 && (
            <span className="tcard__chip">
              <Paperclip size={11} /> {task.attachments.length}
            </span>
          )}
        </span>

        {task.assignee && <Avatar user={task.assignee} size="xs" />}
      </span>
    </button>
  );
}

/** Sortable wrapper — pure presentation stays in TaskCardBody for reuse. */
export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="tcard__wrap">
      <TaskCardBody task={task} onOpen={onOpen} />
    </div>
  );
}
