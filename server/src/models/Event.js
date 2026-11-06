import mongoose from 'mongoose';

const { Schema } = mongoose;

export const EVENT_STATUSES = ['draft', 'pending_approval', 'published', 'rejected', 'cancelled', 'completed'];

const Counter = mongoose.models.Counter || mongoose.model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));

// Atomic per-campus sequence: LPU-0001, LPU-0002, ...
export async function nextShortCode() {
  const c = await Counter.findOneAndUpdate({ _id: 'event' }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `LPU-${String(c.seq).padStart(4, '0')}`;
}

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    shortCode: { type: String, required: true, unique: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coOrganizers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, default: '', maxlength: 10000 }, // markdown
    posterUrl: String,
    posterAlt: String,
    mode: { type: String, enum: ['in_person', 'online', 'hybrid'], default: 'in_person' },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', default: null },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    capacity: { type: Number, min: 1, default: null },
        capacity: { type: Number, min: 1, default: null },
    registeredCount: { type: Number, min: 0, default: 0 }, // seats taken; changed only by atomic updates in the register routes
    waitlistEnabled: { type: Boolean, default: true },
    waitlistCapPercent: { type: Number, min: 0, max: 50, default: 5 },
    registrationOpensAt: { type: Date, default: null },
    registrationClosesAt: { type: Date, default: null },
    price: {
      isFree: { type: Boolean, default: true },
      amountINR: { type: Number, min: 0, default: 0 }, // display label only, no payments
      _id: false,
    },
    status: { type: String, enum: EVENT_STATUSES, default: 'draft' },
    rejectionNote: String,
    conflictOverride: { by: { type: Schema.Types.ObjectId, ref: 'User' }, reason: String, at: Date, _id: false },
    registrationPaused: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

eventSchema.index({ organizationId: 1, status: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ venueId: 1, startAt: 1, endAt: 1, status: 1 }); // used by Slice 3 clash checks

export default mongoose.model('Event', eventSchema);
