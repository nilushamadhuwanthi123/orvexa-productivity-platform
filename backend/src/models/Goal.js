import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    /**
     * task_count  → progress = completed tasks in window / target
     * manual      → progress = current / target, updated by the user
     */
    metric: { type: String, enum: ['task_count', 'manual'], default: 'task_count' },
    target: { type: Number, required: true, min: 1 },
    current: { type: Number, default: 0, min: 0 },
    period: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'custom'], default: 'weekly' },
    startDate: { type: Date, default: Date.now },
    deadline: { type: Date },
    status: { type: String, enum: ['active', 'achieved', 'missed', 'archived'], default: 'active' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

goalSchema.virtual('percent').get(function percent() {
  if (!this.target) return 0;
  return Math.min(100, Math.round((this.current / this.target) * 100));
});

export default mongoose.model('Goal', goalSchema);
