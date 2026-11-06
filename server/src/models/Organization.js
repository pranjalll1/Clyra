import mongoose from 'mongoose';

const orgSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, trim: true },
    verified: { type: Boolean, default: false },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        orgRole: { type: String, enum: ['owner', 'member'], default: 'member' },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

orgSchema.index({ 'members.user': 1 });

export default mongoose.model('Organization', orgSchema);
