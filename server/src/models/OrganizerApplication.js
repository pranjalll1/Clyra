import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ORG_TYPES = ['club', 'department', 'society', 'other'];

const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Organization and institution details the admin checks
    orgName: { type: String, required: true, trim: true, maxlength: 100 },
    orgType: { type: String, enum: ORG_TYPES, required: true },
    institution: { type: String, required: true, trim: true, maxlength: 120 },
    registrationNumber: { type: String, required: true, trim: true, maxlength: 30 },
    position: { type: String, required: true, trim: true, maxlength: 60 },
    facultyName: { type: String, required: true, trim: true, maxlength: 80 },
    facultyEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
    purpose: { type: String, required: true, trim: true, maxlength: 600 },
    proofUrl: { type: String, trim: true, maxlength: 300 },

    // Decision
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true, maxlength: 500 },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
  },
  { timestamps: true }
);

applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('OrganizerApplication', applicationSchema);
