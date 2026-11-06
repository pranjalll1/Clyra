import crypto from 'crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

export const REG_STATUSES = ['registered', 'cancelled'];

// Random code like TK-8F3K2Q9X. No 0/O/1/I so it is easy to read aloud at the gate.
// crypto.randomBytes is unpredictable, so nobody can guess another student's ticket.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function newTicketCode() {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return `TK-${code}`;
}

const registrationSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: REG_STATUSES, default: 'registered' },
    ticketCode: { type: String, default: newTicketCode }, // the value inside the QR code
    cancelledAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// One row per student per event. The database itself blocks duplicates, even from two tabs clicking at once.
registrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
// Scanner lookup at the gate. Unique, and sparse so old rows without a code don't clash.
registrationSchema.index({ ticketCode: 1 }, { unique: true, sparse: true });
// For the "My registrations" page.
registrationSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.models.Registration || mongoose.model('Registration', registrationSchema);