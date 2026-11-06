import mongoose from 'mongoose';
import { config } from './config.js';
import Registration, { newTicketCode } from './models/Registration.js';

await mongoose.connect(config.mongoUri);

const missing = await Registration.find({ ticketCode: { $exists: false } }).select('_id');
for (const r of missing) {
  await Registration.updateOne({ _id: r._id }, { $set: { ticketCode: newTicketCode() } });
}
console.log(`Backfilled ${missing.length} registrations.`);
await mongoose.disconnect();