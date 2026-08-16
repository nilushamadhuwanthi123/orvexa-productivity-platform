import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ body: 'text' });
commentSchema.index({ task: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
