import mongoose from 'mongoose';

/** Immutable audit trail. One document per meaningful state change. */
const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, maxlength: 60 },
    entityType: {
      type: String,
      enum: ['project', 'task', 'comment', 'user', 'milestone', 'goal', 'file'],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    entityLabel: { type: String, default: '', maxlength: 200 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
