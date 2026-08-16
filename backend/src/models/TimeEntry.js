import mongoose from 'mongoose';

const timeEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    /** Duration in seconds, computed on stop or supplied for manual entries. */
    durationSeconds: { type: Number, default: 0, min: 0 },
    note: { type: String, default: '', maxlength: 300 },
    source: { type: String, enum: ['timer', 'manual'], default: 'timer' },
  },
  { timestamps: true }
);

timeEntrySchema.index({ user: 1, startedAt: -1 });
timeEntrySchema.index({ task: 1, startedAt: -1 });

timeEntrySchema.pre('save', function computeDuration(next) {
  if (this.endedAt && this.startedAt && !this.isModified('durationSeconds')) {
    this.durationSeconds = Math.max(0, Math.round((this.endedAt - this.startedAt) / 1000));
  }
  next();
});

export default mongoose.model('TimeEntry', timeEntrySchema);
