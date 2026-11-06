import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from './config.js';
import User from './models/User.js';
import Category from './models/Category.js';
import Venue from './models/Venue.js';
import Organization from './models/Organization.js';

const password = process.env.SEED_PASSWORD || 'ChangeMe123!';

const people = [
  { name: 'Admin (dev)', email: 'admin.dev@lpu.in', role: 'admin' },
  { name: 'Organizer (dev)', email: 'organizer.dev@lpu.in', role: 'organizer' },
  { name: 'Student (dev)', email: 'student.dev@lpu.in', role: 'student' },
];

const categories = [
  'Technology & Hackathons', 'Live Music & Concerts', 'Business & Startups', 'Sports & Tournaments',
  'Creative Arts & Culture', 'Workshops & Career', 'Campus Socials',
];

// Source: LPU "Campus Venues Master List". `units` > 1 marks a venue that is really several independent spaces.
const venues = [
  { code: 'VNU-UNIPOLIS-01', name: 'Baldev Raj Mittal UniPolis', location: 'Block 12', type: 'auditorium', capacity: 30000,
    amenities: ['Solar panel roofing', 'Helicopter-sized industrial cooling fans', 'Helipad access', 'Massive concert stage', 'Heavy power backup infrastructure'] },
  { code: 'VNU-SDMAUD-02', name: 'Shanti Devi Mittal Auditorium', location: 'Block 35', type: 'auditorium', capacity: 2500,
    amenities: ['Central air conditioning', 'Advanced integrated AV systems', 'VIP green rooms', 'Premium acoustic panelling', 'Professional backstage wings'] },
  { code: 'VNU-BRMAUD-03', name: 'Baldev Raj Mittal Auditorium', location: 'Block 1', type: 'auditorium', capacity: 500,
    amenities: ['Full air conditioning', 'Fixed tiered theater seating', 'High-lumen projector & screen setup', 'Podium dedicated audio system'] },
  { code: 'VNU-OAA-04', name: 'Central OpenAir Theaters (OAT)', location: 'Various (6 clusters)', type: 'auditorium', capacity: 1500, units: 6,
    amenities: ['Open-sky concrete step seating', 'Elevated open stages', 'Fixed ambient field lighting', 'Distributed audio points'] },
  { code: 'VNU-INDSTAD-05', name: 'Shanti Devi Mittal Indoor Sports Stadium', location: 'Sports Complex', type: 'sports', capacity: 5000,
    amenities: ['Olympic-size swimming pool', 'Professional diving platforms', 'Wooden badminton courts', 'Squash courts', 'Indoor shooting & archery arena', 'Central AC', 'Electronic scoreboards'] },
  { code: 'VNU-CRICKET-06', name: 'Main Cricket Stadium & Athletics Track', location: 'Outdoor Sports Wing', type: 'sports', capacity: 15000,
    amenities: ['Professional turf pitch', '400m all-weather synthetic running track', 'High-intensity match floodlights', 'Player dugouts & change rooms'] },
  { code: 'VNU-XLARENA-07', name: 'XL Arena & Football Turfs', location: 'Behind BH-2', type: 'sports', capacity: 1000,
    amenities: ['High-grade artificial grass turf', 'Perimeter sports fencing', 'Night floodlight infrastructure', 'Designed for 7v7 football/futsal formats'] },
  { code: 'VNU-UNIMALL-08', name: 'Uni-Mall Central Atrium', location: 'Uni-Mall Complex', type: 'hub', capacity: 2000,
    amenities: ['Multi-level balcony walkway footfall visibility', 'Central air conditioning', 'Built-in floor power outlets for brand kiosks', 'High passenger lift access'] },
  { code: 'VNU-STUCENT-09', name: 'Student Centre Open Lounge', location: 'Central Campus Hub', type: 'hub', capacity: 1200,
    amenities: ['High student foot traffic', 'Food court proximity', 'Semi-covered open seating areas', 'Distributed charging outlets'] },
  { code: 'VNU-LIBEXH-10', name: 'Central Library Exhibition Foyer', location: 'Library Block Entrance', type: 'hub', capacity: 400,
    amenities: ['Quiet zone border proximity', 'Integrated wooden display boards', 'Integrated digital informational screens', 'High natural illumination'] },
  { code: 'VNU-SEMHALL-11', name: 'Standard Block Seminar Halls', location: 'Multi-block configuration', type: 'academic', capacity: 200,
    amenities: ['Smart interactive boards', 'Overhead projector systems', 'Integrated microphone & ceiling speakers', 'Split air conditioners'] },
  { code: 'VNU-MOOTCRT-12', name: 'School of Law Moot Court Room', location: 'Law Block', type: 'academic', capacity: 100,
    amenities: ['Elevated judges bench', 'Witness boxes', 'Dual council tables', 'Dedicated audio/video recording systems for legal proceedings'] },
];

await mongoose.connect(config.mongoUri);

const passwordHash = await bcrypt.hash(password, 12);
for (const p of people) {
  await User.updateOne({ email: p.email }, { $set: { ...p, passwordHash, emailVerifiedAt: new Date() } }, { upsert: true });
  console.log(`seeded ${p.role}: ${p.email}`);
}

for (const [i, name] of categories.entries()) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
  await Category.updateOne({ slug }, { $set: { name, slug, order: i } }, { upsert: true });
}
for (const v of venues) await Venue.updateOne({ code: v.code }, { $set: { units: 1, ...v } }, { upsert: true });
console.log(`seeded ${categories.length} categories, ${venues.length} venues`);

// Placeholder club so the organizer account can create events. Replace with real clubs later.
const organizer = await User.findOne({ email: 'organizer.dev@lpu.in' });
await Organization.updateOne(
  { slug: 'sample-club-dev' },
  { $set: { name: 'Sample Club (dev)', slug: 'sample-club-dev', verified: true, members: [{ user: organizer._id, orgRole: 'owner' }] } },
  { upsert: true }
);
console.log('seeded placeholder organization: Sample Club (dev)');
console.log('Dev accounts share SEED_PASSWORD from .env. Do not use them in production.');
await mongoose.disconnect();
