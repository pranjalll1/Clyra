import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // e.g. registration, event_approved, event_rejected, event_cancelled, event_submitted
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: '', maxlength: 400 },
    link: { type: String, default: '' }, // in-app path, e.g. /my-bookings
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // auto-delete after 90 days

export default mongoose.model('Notification', notificationSchema);
