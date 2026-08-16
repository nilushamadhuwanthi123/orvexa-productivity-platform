import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import TaskCard, { TaskCardBody } from './TaskCard.jsx';
import { TASK_STATUSES } from '../../constants/index.js';
import './tasks.css';

function Column({ status, tasks, onOpen, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value, data: { type: 'column' } });

  return (
    <section className={`column ${isOver ? 'is-over' : ''}`} aria-label={status.label}>
      <header className="column__head">
        <span className="column__dot" style={{ background: status.color }} aria-hidden="true" />
        <span className="column__name grow">{status.label}</span>
        <span className="column__count">{tasks.length}</span>
      </header>

      <div className="column__body" ref={setNodeRef}>
        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <p className="column__empty">
              Drop a task here, or create one to start this column.
            </p>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task._id} task={task} onOpen={() => onOpen(task)} />
            ))
          )}
        </SortableContext>
      </div>

      <button type="button" className="column__add" onClick={() => onAdd(status.value)}>
        <Plus size={14} /> Add task
      </button>
    </section>
  );
}

/**
 * Drag and drop board. Moves are applied optimistically and rolled back by the
 * caller's onMove handler if the request fails, so the board never lies about
 * what was saved.
 */
export default function KanbanBoard({ tasks, onOpen, onAdd, onMove }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = useMemo(() => {
    const map = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, []]));
    for (const t of tasks) (map[t.status] ||= []).push(t);
    for (const key of Object.keys(map)) map[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return map;
  }, [tasks]);

  const findStatus = (id) => {
    if (columns[id]) return id;
    return tasks.find((t) => t._id === id)?.status || null;
  };

  const onDragStart = ({ active }) => {
    setActiveTask(tasks.find((t) => t._id === active.id) || null);
  };

  const onDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const task = tasks.find((t) => t._id === active.id);
    if (!task) return;

    const targetStatus = findStatus(over.id);
    if (!targetStatus) return;

    const targetList = columns[targetStatus].filter((t) => t._id !== task._id);
    const overIndex = targetList.findIndex((t) => t._id === over.id);
    const order = overIndex === -1 ? targetList.length : overIndex;

    if (targetStatus === task.status && order === columns[targetStatus].indexOf(task)) return;

    onMove(task, { status: targetStatus, order });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="board">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status.value}
            status={status}
            tasks={columns[status.value] || []}
            onOpen={onOpen}
            onAdd={onAdd}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {activeTask && <TaskCardBody task={activeTask} dragging onOpen={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
