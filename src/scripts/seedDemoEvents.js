// Adds 12 upcoming PUBLISHED demo events (one per day, so no venue clashes) so the landing page and discovery look real.
// Run once from the server folder:  node src/seedDemoEvents.js   (safe to run twice: existing titles are skipped)
// NOTE: registeredCount values below are fake demo numbers (no Registration rows behind them).
import mongoose from 'mongoose';
import { config } from '../shared/server/config.js';
import Event, { nextShortCode } from '../shared/models/Event.js';
import Organization from '../shared/models/Organization.js';
import Category from '../shared/models/Category.js';
import Venue from '../shared/models/Venue.js';
import User from '../shared/models/User.js';

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const at = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

await mongoose.connect(config.mongoUri);

const org = await Organization.findOne();
if (!org) throw new Error('No organization found. Run the main seed first.');
const creator = org.members?.[0]?.user ?? (await User.findOne({ role: { $in: ['organizer', 'admin'] } }))?._id;
if (!creator) throw new Error('No organizer/admin user found.');

const categories = await Category.find().sort('order');
const venues = await Venue.find({ isActive: true });
if (!categories.length || !venues.length) throw new Error('Run the main seed first (categories/venues missing).');

// [title, category#, mode, dayFromToday, startHour, endHour, isFree, amountINR, fakeRegistrations, description]
const rows = [
  ['Resume and Interview Workshop', 5, 'in_person', 1, 10, 13, true, 0, 40, 'Hands-on session on writing a strong resume and handling technical and HR interviews.'],
  ['Open Mic Night', 1, 'in_person', 2, 18, 21, true, 0, 55, 'Sing, play, recite or just listen. Sign up on the spot and take the stage.'],
  ['Intercollegiate Hackathon Finals', 0, 'in_person', 3, 9, 21, true, 0, 90, 'Twelve shortlisted teams build and demo in one day. Judges from industry.'],
  ['Startup Pitch Night', 2, 'hybrid', 4, 17, 20, false, 50, 35, 'Student founders pitch to mentors and alumni investors. Join in person or online.'],
  ['Inter-Department Cricket League', 3, 'in_person', 5, 8, 17, true, 0, 70, 'League matches all day. Come and support your department.'],
  ['Street Art and Mural Day', 4, 'in_person', 6, 11, 16, true, 0, 25, 'Paint a campus wall with the art club. Materials are provided.'],
  ['Freshers Social Evening', 6, 'in_person', 7, 18, 22, false, 100, 80, 'Music, food and games to welcome the new batch.'],
  ['Cloud Computing Webinar', 0, 'online', 8, 16, 18, true, 0, 30, 'Intro to cloud platforms and how to get your first certification.'],
  ['Product Management 101', 5, 'online', 9, 11, 13, true, 0, 45, 'What a product manager does and how to start from campus.'],
  ['Classical Music Evening', 1, 'in_person', 10, 19, 21, false, 150, 50, 'An evening of classical performances by student and guest artists.'],
  ['Basketball 3v3 Tournament', 3, 'in_person', 11, 9, 16, false, 50, 60, 'Teams of three, knockout format. Register your team early.'],
  ['Photography Exhibition Opening', 4, 'in_person', 12, 17, 20, true, 0, 20, 'Opening night of the photography club exhibition, with a talk by the winners.'],
];

let created = 0;
for (const [i, r] of rows.entries()) {
  const [title, c, mode, day, startHour, endHour, isFree, amountINR, fakeRegs, description] = r;
  if (await Event.exists({ title })) continue;
  const venue = mode === 'online' ? null : venues[(i * 2 + 1) % venues.length];
  const capacity = venue ? Math.min(venue.capacity, 120) : 150;
  const shortCode = await nextShortCode();
  await Event.create({
    title, slug: `${slugify(title)}-${shortCode.toLowerCase()}`, shortCode,
    organizationId: org._id, createdBy: creator, categoryId: categories[c % categories.length]._id,
    description, mode, venueId: venue?._id ?? null,
    startAt: at(day, startHour), endAt: at(day, endHour), capacity,
    registeredCount: Math.min(fakeRegs, capacity),
    price: { isFree, amountINR }, status: 'published',
  });
  created++;
}
console.log(`Created ${created} demo events (${rows.length - created} already existed).`);
await mongoose.disconnect();
