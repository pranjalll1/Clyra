import mongoose from 'mongoose';

export const ROLES = ['student', 'organizer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'student' },
    requestedRole: { type: String, enum: ['student', 'organizer'], default: 'student' }, // what they chose at sign-up
    emailVerifiedAt: { type: Date, default: null },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date, default: null },
    department: { type: String, trim: true },
    year: { type: Number, min: 1, max: 8 },
    interests: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    requestedRole: this.requestedRole,
    emailVerified: !!this.emailVerifiedAt,
    department: this.department,
    year: this.year,
    interests: this.interests,
  };
};

export default mongoose.model('User', userSchema);
