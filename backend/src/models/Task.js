import mongoose from 'mongoose';

export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 10000 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: TASK_STATUSES, default: 'todo', index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium', index: true },
    dueDate: { type: Date, default: null, index: true },
    startDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    labels: [{ type: String, trim: true, maxlength: 30 }],
    checklist: { type: [checklistItemSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },
    estimatedHours: { type: Number, default: 0, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

taskSchema.index({ title: 'text', description: 'text', labels: 'text' });
taskSchema.index({ project: 1, status: 1, order: 1 });
taskSchema.index({ assignee: 1, status: 1, dueDate: 1 });

taskSchema.virtual('isOverdue').get(function isOverdue() {
  return Boolean(this.dueDate && this.status !== 'done' && this.dueDate < new Date());
});

taskSchema.virtual('checklistProgress').get(function checklistProgress() {
  const total = this.checklist?.length || 0;
  const done = this.checklist?.filter((c) => c.done).length || 0;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
});

// Keep completedAt in sync with status transitions.
taskSchema.pre('save', function syncCompletedAt(next) {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) this.completedAt = new Date();
    if (this.status !== 'done') this.completedAt = null;
  }
  next();
});

export default mongoose.model('Task', taskSchema);
