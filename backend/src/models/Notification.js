import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'task_assigned',
  'task_completed',
  'task_overdue',
  'mention',
  'project_invitation',
  'deadline_approaching',
  'status_changed',
  'dependency_completed',
  'project_at_risk',
  'comment_added',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, default: '', maxlength: 500 },
    link: { type: String, default: '' },
    entity: {
      kind: { type: String, enum: ['task', 'project', 'comment', 'user'], default: 'task' },
      id: { type: mongoose.Schema.Types.ObjectId },
    },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
