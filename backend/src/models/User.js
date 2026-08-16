import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['admin', 'manager', 'employee'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'employee', index: true },
    avatarUrl: { type: String, default: '' },
    jobTitle: { type: String, default: '', maxlength: 80 },
    department: { type: String, default: '', maxlength: 80 },
    bio: { type: String, default: '', maxlength: 500 },
    skills: [{ type: String, trim: true, maxlength: 40 }],
    location: { type: String, default: '', maxlength: 80 },
    availability: {
      type: String,
      enum: ['available', 'busy', 'away', 'offline'],
      default: 'available',
    },
    weeklyTaskGoal: { type: Number, default: 20, min: 0, max: 200 },
    onboardingCompleted: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now },
    refreshTokens: { type: [String], default: [], select: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.index({ name: 'text', email: 'text', jobTitle: 'text' });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);
