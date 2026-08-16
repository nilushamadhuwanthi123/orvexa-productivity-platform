import mongoose from 'mongoose';

export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'];
export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectRole: { type: String, enum: ['owner', 'manager', 'contributor'], default: 'contributor' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Project name is required'], trim: true, maxlength: 120 },
    key: { type: String, trim: true, uppercase: true, maxlength: 8 },
    description: { type: String, default: '', maxlength: 4000 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [memberSchema], default: [] },
    status: { type: String, enum: PROJECT_STATUSES, default: 'planning', index: true },
    priority: { type: String, enum: PROJECT_PRIORITIES, default: 'medium' },
    startDate: { type: Date, default: Date.now },
    deadline: { type: Date },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    color: { type: String, default: 'emerald' },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

projectSchema.index({ name: 'text', description: 'text', tags: 'text' });
projectSchema.index({ 'members.user': 1, status: 1 });
projectSchema.index({ deadline: 1 });

projectSchema.virtual('memberCount').get(function memberCount() {
  return this.members?.length || 0;
});

/** Returns true when the given userId owns or belongs to this project. */
projectSchema.methods.hasMember = function hasMember(userId) {
  const id = String(userId);
  if (String(this.owner?._id || this.owner) === id) return true;
  return this.members.some((m) => String(m.user?._id || m.user) === id);
};

export default mongoose.model('Project', projectSchema);
