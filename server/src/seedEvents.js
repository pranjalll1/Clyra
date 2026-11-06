import mongoose from 'mongoose';
import { config } from './config.js';
import Event, { nextShortCode } from './models/Event.js';
import Organization from './models/Organization.js';
import Category from './models/Category.js';
import Venue from './models/Venue.js';
import User from './models/User.js';

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// Helper: a date `days` from now at a given hour.
const at = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

await mongoose.connect(config.mongoUri);

const org = await Organization.findOne();
if (!org) throw new Error('No organization found. Create one first.');
const creator = org.members?.[0]?.user ?? (await User.findOne({ role: { $in: ['organizer', 'admin'] } }))?._id;
if (!creator) throw new Error('No organizer/admin user found.');

const categories = await Category.find().sort('order');
const venues = await Venue.find({ isActive: true });
if (!categories.length || !venues.length) throw new Error('Run the main seed first (categories/venues missing).');

const cat = (i) => categories[i % categories.length]._id;
const ven = (i) => venues[i % venues.length];

// [title, category#, venue#|null, mode, startAt, endAt, isFree, amountINR, status]
const rows = [
  ['Hack the Campus 24h', 0, 0, 'in_person', at(1, 18), at(2, 18), true, 0, 'published'],
  ['Unplugged Acoustic Night', 1, 1, 'in_person', at(2, 19), at(2, 22), false, 150, 'published'],
  ['Intro to Web3 Webinar', 0, null, 'online', at(3, 17), at(3, 19), true, 0, 'published'],
  ['Inter-Hostel Football Cup', 2, 2, 'in_person', at(4, 16), at(4, 20), true, 0, 'published'],
  ['Startup Pitch Fest', 3, 3, 'hybrid', at(6, 14), at(6, 18), false, 100, 'published'],
  ['Photography Walk', 1, 0, 'in_person', at(8, 7), at(8, 10), true, 0, 'published'],
  ['Last Month Alumni Meet (ENDED)', 3, 0, 'in_person', at(-10, 10), at(-10, 13), true, 0, 'published'], // must be hidden
  ['Secret Draft Event (DRAFT)', 0, 0, 'in_person', at(5, 10), at(5, 12), true, 0, 'draft'], // must be hidden
];

let created = 0;
for (const [i, r] of rows.entries()) {
  const [title, c, v, mode, startAt, endAt, isFree, amountINR, status] = r;
  if (await Event.exists({ title })) continue; // safe to run twice
  const venue = v === null ? null : ven(v);
  const shortCode = await nextShortCode();
  await Event.create({
    title, slug: `${slugify(title)}-${shortCode.toLowerCase()}`, shortCode,
    organizationId: org._id, createdBy: creator, categoryId: cat(c),
    description: `Demo event: ${title}`, mode, venueId: venue?._id ?? null,
    startAt, endAt, capacity: venue ? Math.min(venue.capacity, 100) : 100,
    price: { isFree, amountINR }, status,
  });
  created++;
}
console.log(`Created ${created} events (${rows.length - created} already existed).`);
await mongoose.disconnect();