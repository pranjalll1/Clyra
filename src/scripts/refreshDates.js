import mongoose from 'mongoose';
import { config } from '../shared/server/config.js';
import Event from '../shared/models/Event.js';

const DAY = 24 * 60 * 60 * 1000;
await mongoose.connect(config.mongoUri);
const now = new Date();
const old = await Event.find({ status: 'published', endAt: { $lt: now } });
let i = 0;
for (const e of old) {
  const d = (Math.ceil((now - e.startAt) / DAY) + 1 + (i++ % 20)) * DAY;
  const set = { startAt: new Date(e.startAt.getTime() + d), endAt: new Date(e.endAt.getTime() + d) };
  if (e.registrationOpensAt) set.registrationOpensAt = new Date(e.registrationOpensAt.getTime() + d);
  if (e.registrationClosesAt) set.registrationClosesAt = new Date(e.registrationClosesAt.getTime() + d);
  await Event.updateOne({ _id: e._id }, { $set: set });
}
console.log(`Moved ${old.length} events forward`);
await mongoose.disconnect();