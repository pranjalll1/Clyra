// One-time cleanup: activates accounts created while email verification was still on.
// Run once after removing the verification system:  node src/activateUsers.js
import mongoose from 'mongoose';
import { config } from './config.js';
import User from './models/User.js';

await mongoose.connect(config.mongoUri);
const r = await User.updateMany({ emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } });
console.log(`Activated ${r.modifiedCount} account(s).`);
await mongoose.disconnect();
