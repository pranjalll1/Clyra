import mongoose from 'mongoose';
import { config } from '../shared/server/config.js';
import Registration, { newTicketCode } from '../shared/models/Registration.js';

await mongoose.connect(config.mongoUri);

const missing = await Registration.find({ ticketCode: { $exists: false } }).select('_id');
for (const r of missing) {
  await Registration.updateOne({ _id: r._id }, { $set: { ticketCode: newTicketCode() } });
}
console.log(`Backfilled ${missing.length} registrations.`);
await mongoose.disconnect();
