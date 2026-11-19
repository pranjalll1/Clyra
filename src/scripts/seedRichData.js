// One command that makes the database feel real:
//   - 7 clubs (events are moved from the sample club to the club that fits their category)
//   - 40 student accounts with departments, years and interests
//   - registrations for every published event (and check-ins for events that already ended)
//   - poster images for events that have none
// Run from the server folder:  node src/seedRichData.js     (safe to run twice)
// Student login for demos: any seeded email + password  Student@123
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { config } from '../shared/server/config.js';
import Event from '../shared/models/Event.js';
import Organization from '../shared/models/Organization.js';
import Category from '../shared/models/Category.js';
import User from '../shared/models/User.js';
import Registration from '../shared/models/Registration.js';

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const POSTER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/posters');

// Same random numbers every run, so the demo data is repeatable.
let state = 20261112;
const rand = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

let bcrypt;
try { bcrypt = (await import('bcrypt')).default; } catch { bcrypt = (await import('bcryptjs')).default; }

await mongoose.connect(config.mongoUri);

const categories = await Category.find().sort('order');
if (!categories.length) throw new Error('No categories found. Run the main seed first (node src/seed.js).');
const sampleOrg = await Organization.findOne().sort('createdAt');
if (!sampleOrg) throw new Error('No organization found. Run the main seed first.');
const owner = sampleOrg.members?.[0]?.user ?? (await User.findOne({ role: { $in: ['organizer', 'admin'] } }))?._id;
if (!owner) throw new Error('No organizer/admin user found.');

// ---------- 1. Clubs (one per category, same order as the categories) ----------
const CLUBS = [
  ['Coding Club', 'Hackathons, workshops and open-source drives.'],
  ['Music Society', 'Concerts, open mics and jam sessions.'],
  ['Entrepreneurship Cell', 'Pitch nights, founder talks and startup support.'],
  ['Sports Council', 'Tournaments and leagues across every hostel and department.'],
  ['Arts and Culture Club', 'Exhibitions, murals, photography and theatre.'],
  ['Career Development Cell', 'Workshops on interviews, resumes and skills.'],
  ['Student Council', 'Socials, freshers events and campus life.'],
];
const clubs = [];
for (const [name, description] of CLUBS) {
  const slug = slugify(name);
  let club = await Organization.findOne({ slug });
  if (!club) club = await Organization.create({ name, slug, description, verified: true, members: [{ user: owner, orgRole: 'owner' }] });
  clubs.push(club);
}

// ---------- 2. Students ----------
const FIRST = ['Aarav', 'Ananya', 'Rohan', 'Priya', 'Karan', 'Sneha', 'Vikram', 'Neha', 'Arjun', 'Isha'];
const LAST = ['Sharma', 'Verma', 'Singh', 'Gupta'];
const DEPTS = ['CSE', 'ECE', 'Mechanical', 'Civil', 'MBA', 'Design', 'Biotechnology'];
const passwordHash = await bcrypt.hash('Student@123', 10);

const students = [];
let newStudents = 0;
for (const first of FIRST) {
  for (const last of LAST) {
    const email = `${first}.${last}@lpu.in`.toLowerCase();
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        name: `${first} ${last}`, email, passwordHash, role: 'student', emailVerifiedAt: new Date(),
        department: pick(DEPTS), year: 1 + Math.floor(rand() * 4),
        interests: shuffle(categories).slice(0, 2).map((c) => c.slug),
      });
      newStudents++;
    }
    students.push(u);
  }
}

// ---------- 3. Events: club, registrations, posters ----------
const events = await Event.find({ status: 'published', archivedAt: null });
const now = new Date();
let regsCreated = 0;
let postersSet = 0;
let moved = 0;

for (const e of events) {
  // Move events from the sample club to the club that matches their category.
  if (String(e.organizationId) === String(sampleOrg._id)) {
    const idx = categories.findIndex((c) => String(c._id) === String(e.categoryId));
    if (idx >= 0) { e.organizationId = clubs[idx % clubs.length]._id; moved++; }
  }

  // Poster: a designed image named after the event, or the default one.
  if (!e.posterUrl) {
    const file = `${slugify(e.title)}.svg`;
    const exists = fs.existsSync(path.join(POSTER_DIR, file));
    if (exists || fs.existsSync(path.join(POSTER_DIR, 'default.svg'))) {
      e.posterUrl = `/posters/${exists ? file : 'default.svg'}`;
      e.posterAlt = `Poster for ${e.title}`;
      postersSet++;
    }
  }
  await e.save();

  // Registrations: 20% to 90% of the students, never above the event's capacity.
  const already = await Registration.countDocuments({ eventId: e._id, status: 'registered' });
  const wanted = Math.floor(students.length * (0.2 + rand() * 0.7));
  const room = e.capacity ? Math.max(0, e.capacity - already) : Infinity;
  const target = Math.max(0, Math.min(wanted - already, room));
  const ended = e.endAt && e.endAt < now;

  for (const s of shuffle(students).slice(0, target)) {
    try {
      await Registration.create({
        eventId: e._id, userId: s._id, status: 'registered',
        checkedInAt: ended && rand() < 0.8 ? new Date(e.startAt.getTime() + 15 * 60000) : null,
      });
      regsCreated++;
    } catch (err) {
      if (err.code !== 11000) throw err; // 11000 = this student was already registered
    }
  }

  // Keep the seat counter equal to the real number of registrations.
  const real = await Registration.countDocuments({ eventId: e._id, status: 'registered' });
  await Event.updateOne({ _id: e._id }, { $set: { registeredCount: real } });
}

console.log(`Clubs: ${clubs.length} ready. Students: ${newStudents} created (${students.length} total).`);
console.log(`Events updated: ${events.length} (moved to clubs: ${moved}, posters added: ${postersSet}). Registrations created: ${regsCreated}.`);
console.log('Demo student login: any seeded email, e.g. aarav.sharma@lpu.in, password Student@123');
await mongoose.disconnect();
