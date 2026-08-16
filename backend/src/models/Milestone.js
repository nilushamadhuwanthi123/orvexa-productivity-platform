import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['upcoming', 'in_progress', 'completed', 'missed'],
      default: 'upcoming',
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

milestoneSchema.index({ project: 1, dueDate: 1 });

export default mongoose.model('Milestone', milestoneSchema);
