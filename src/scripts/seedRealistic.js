// Makes the demo data consistent and realistic. Every number in the app is then a real count of real rows:
//   - ~300 demo students with names, departments and interests
//   - registrations (some cancelled) tied to those students, weighted by their interests
//   - check-ins for events that already happened
//   - organizer requests (pending, approved, rejected) and events waiting for admin review, including one venue clash
//   - notifications for the admin and the demo student
//   - every event's registeredCount recomputed from the registrations table
// Run `node src/seed.js` and `node src/seedShowcase.js` first. Safe to run again.
//   node src/seedRealistic.js           add what is missing
//   node src/seedRealistic.js --reset   remove the demo students (and their data) first, then rebuild
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../shared/server/config.js';
import User from '../shared/models/User.js';
import Event, { nextShortCode } from '../shared/models/Event.js';
import Organization from '../shared/models/Organization.js';
import Category from '../shared/models/Category.js';
import Venue from '../shared/models/Venue.js';
import Registration from '../shared/models/Registration.js';
import OrganizerApplication from '../shared/models/OrganizerApplication.js';
import Notification from '../shared/models/Notification.js';

const RESET = process.argv.includes('--reset');
const STUDENTS = 100;
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();

// Fixed seed so a rebuild gives the same people.
let seed = 42;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const at = (days, hour, minute = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hour, minute, 0, 0); return d; };

const FIRST = ['Aarav', 'Aditi', 'Aditya', 'Ananya', 'Anika', 'Arjun', 'Avni', 'Dev', 'Diya', 'Gurpreet', 'Harleen', 'Ishaan', 'Jasleen', 'Karan', 'Kavya', 'Manpreet', 'Mohit', 'Naina', 'Nikhil', 'Pooja', 'Prabhjot', 'Priya', 'Rahul', 'Riya', 'Rohit', 'Sahil', 'Sanya', 'Simran', 'Tanvi', 'Vansh', 'Yash', 'Zoya', 'Harsh', 'Neha', 'Siddharth', 'Tara'];
const LAST = ['Sharma', 'Singh', 'Kaur', 'Gupta', 'Verma', 'Mehta', 'Joshi', 'Bansal', 'Chopra', 'Malhotra', 'Arora', 'Kapoor', 'Nair', 'Reddy', 'Iyer', 'Das', 'Patel', 'Yadav', 'Mishra', 'Sethi', 'Khanna', 'Bhatia', 'Grewal', 'Sandhu'];
const DEPTS = ['Computer Science', 'Electronics and Communication', 'Mechanical Engineering', 'Civil Engineering', 'Business Administration', 'Law', 'Design', 'Biotechnology', 'Agriculture', 'Pharmacy'];
// How full each kind of event tends to get (before some randomness).
const FILL = { 'live-music-concerts': 0.7, 'technology-hackathons': 0.6, 'creative-arts-culture': 0.55, 'sports-tournaments': 0.5, 'campus-socials': 0.5, 'workshops-career': 0.45, 'business-startups': 0.4 };

await mongoose.connect(config.mongoUri);

if (!Registration.schema.path('ticketCode')) throw new Error('Registration model has no ticketCode field. Send me models/Registration.js.');
const admin = await User.findOne({ email: 'admin.dev@lpu.in' }) || await User.findOne({ role: 'admin' });
const organizer = await User.findOne({ email: 'organizer.dev@lpu.in' }) || await User.findOne({ role: 'organizer' });
const studentDev = await User.findOne({ email: 'student.dev@lpu.in' });
if (!admin || !organizer) throw new Error('Run `node src/seed.js` first (admin or organizer account missing).');
const categories = await Category.find().sort('order');
if (!categories.length) throw new Error('Run `node src/seed.js` first (no categories).');
const venueByCode = new Map((await Venue.find()).map((v) => [v.code, v]));
const demo = { email: /\.demo@lpu\.in$/i };

if (RESET) {
  const ids = await User.find(demo).distinct('_id');
  await Promise.all([
    Registration.deleteMany({ userId: { $in: ids } }),
    OrganizerApplication.deleteMany({ userId: { $in: ids } }),
    Notification.deleteMany({ userId: { $in: ids } }),
    Organization.deleteMany({ slug: 'yoga-wellness-club' }),
  ]);
  await User.deleteMany({ _id: { $in: ids } });
  console.log(`Removed ${ids.length} demo students and their data.`);
}

// ---------- 1. Students ----------
const have = await User.countDocuments(demo);
if (have < STUDENTS) {
  const password = process.env.SEED_PASSWORD || crypto.randomBytes(12).toString('hex'); // demo students cannot sign in unless you set SEED_PASSWORD
  const passwordHash = await bcrypt.hash(password, 12);
  const used = new Set((await User.find(demo).select('email')).map((u) => u.email));
  const docs = [];
  for (let i = 0; docs.length < STUDENTS - have; i++) {
    const first = pick(FIRST), last = pick(LAST);
    const email = `${first}.${last}.${i}.demo@lpu.in`.toLowerCase();
    if (used.has(email)) continue;
    used.add(email);
    const interests = [pick(categories).name, pick(categories).name].filter((v, k, a) => a.indexOf(v) === k);
    docs.push({
      name: `${first} ${last}`, email, passwordHash, role: 'student', requestedRole: 'student',
      emailVerifiedAt: new Date(now - rnd() * 90 * DAY), department: pick(DEPTS), year: 1 + Math.floor(rnd() * 4), interests,
    });
  }
  await User.insertMany(docs, { ordered: false });
  console.log(`Created ${docs.length} demo students.`);
}
const students = await User.find(demo).select('_id interests');
const studentIds = students.map((s) => s._id);

// ---------- 2. Registrations and check-ins ----------
const usedCodes = new Set(await Registration.find().distinct('ticketCode'));
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { let c; do { c = 'TK-' + Array.from({ length: 8 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join(''); } while (usedCodes.has(c)); usedCodes.add(c); return c; };

const published = await Event.find({ status: 'published', archivedAt: null }).populate('categoryId', 'name slug');
let regCount = 0;
for (const e of published) {
  const opens = e.registrationOpensAt || new Date(e.startAt - 14 * DAY);
  if (opens > now) continue; // registration has not opened yet, so nobody could have registered
  if (await Registration.exists({ eventId: e._id, userId: { $in: studentIds } })) continue;

  const past = e.endAt < now;
  const slug = e.categoryId?.slug;
  const wanted = Math.round((e.capacity || 100) * Math.min(0.95, Math.max(0.08, (FILL[slug] ?? 0.45) * (0.75 + rnd() * 0.5))));
  const target = Math.max(5, Math.min(wanted, e.capacity || wanted, Math.floor(studentIds.length * 0.85)));

  // Students whose interests match the event's category are more likely to sign up.
  const chosen = students
    .map((s) => ({ s, k: (s.interests.includes(e.categoryId?.name) ? 0 : 0.5) + rnd() * 0.5 }))
    .sort((a, b) => a.k - b.k).slice(0, target);

  const hi = Math.min(now.getTime(), e.startAt.getTime() - 3600000);
  const lo = Math.min(opens.getTime(), hi);
  const docs = chosen.map(({ s }) => {
    const createdAt = new Date(lo + rnd() * (hi - lo));
    const cancelled = rnd() < 0.05;
    const doc = { eventId: e._id, userId: s._id, ticketCode: newCode(), status: cancelled ? 'cancelled' : 'registered', createdAt };
    if (cancelled) doc.cancelledAt = new Date(createdAt.getTime() + rnd() * Math.max(0, hi - createdAt.getTime()));
    else if (past && rnd() < 0.82) { doc.checkedInAt = new Date(e.startAt.getTime() + rnd() * 40 * 60000); doc.checkedInBy = organizer._id; }
    return doc;
  });
  await Registration.insertMany(docs, { ordered: false });
  regCount += docs.length;
}
console.log(`Created ${regCount} registrations.`);

// The demo student account gets a believable booking history.
if (studentDev && !(await Registration.exists({ userId: studentDev._id }))) {
  const mine = published.filter((e) => (e.registrationOpensAt || 0) <= now && e.endAt >= now).sort((a, b) => a.startAt - b.startAt).slice(0, 4);
  const earlier = published.find((e) => e.endAt < now);
  const docs = [...mine, ...(earlier ? [earlier] : [])].map((e) => {
    const past = e.endAt < now;
    return { eventId: e._id, userId: studentDev._id, ticketCode: newCode(), status: 'registered', createdAt: new Date(Math.min(now, e.startAt) - 2 * DAY), ...(past ? { checkedInAt: new Date(e.startAt.getTime() + 15 * 60000), checkedInBy: organizer._id } : {}) };
  });
  if (docs.length) await Registration.insertMany(docs);
  console.log(`Gave student.dev@lpu.in ${docs.length} bookings.`);
}

// ---------- 3. Organizer requests ----------
const applicants = [
  { name: 'Rohan Verma', club: 'Cyber Security Club', type: 'club', position: 'Secretary', faculty: 'Dr. Anita Mehta', reg: '12305871', status: 'pending', purpose: 'Monthly capture-the-flag contests, security awareness talks and a beginner workshop series for first-year students.' },
  { name: 'Ishita Kapoor', club: 'Design Students Chapter', type: 'society', position: 'Vice President', faculty: 'Prof. Karan Bedi', reg: '12307744', status: 'pending', purpose: 'Portfolio review nights, poster design contests and visiting-artist talks for the design department.' },
  { name: 'Kabir Malhotra', club: 'Gaming and Esports Society', type: 'society', position: 'Founder', faculty: 'Dr. S. Grewal', reg: '12304120', status: 'rejected', purpose: 'Inter-hostel gaming tournaments and a yearly esports festival.', note: 'We could not verify the faculty coordinator. Add a coordinator email we can confirm and apply again.' },
  { name: 'Meera Nair', club: 'Yoga & Wellness Club', type: 'club', position: 'President', faculty: 'Dr. Latha Menon', reg: '12302956', status: 'approved', purpose: 'Weekly yoga mornings, stress-management sessions and a wellness week in each semester.' },
];
const appUsers = {};
for (const a of applicants) {
  const email = `${a.name.toLowerCase().replace(/[^a-z]+/g, '.')}.apply.demo@lpu.in`;
  let u = await User.findOne({ email });
  if (!u) {
    u = await User.create({ name: a.name, email, passwordHash: crypto.randomBytes(16).toString('hex'), role: 'student', requestedRole: 'organizer', emailVerifiedAt: new Date(now - 20 * DAY), department: pick(DEPTS), year: 3 });
  }
  appUsers[a.club] = u;
  if (await OrganizerApplication.exists({ userId: u._id })) continue;

  const doc = {
    userId: u._id, orgName: a.club, orgType: a.type, institution: 'Lovely Professional University', registrationNumber: a.reg, position: a.position,
    facultyName: a.faculty, facultyEmail: `${a.faculty.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@example.com`,
    purpose: a.purpose, status: a.status, createdAt: new Date(now - (a.status === 'pending' ? rnd() * 2 : 6 + rnd() * 5) * DAY),
  };
  if (a.status !== 'pending') { doc.reviewedBy = admin._id; doc.reviewedAt = new Date(now - 2 * DAY); }
  if (a.status === 'rejected') doc.reviewNote = a.note;
  if (a.status === 'approved') {
    u.role = 'organizer'; await u.save();
    const org = await Organization.findOneAndUpdate(
      { slug: slugify(a.club) },
      { $setOnInsert: { name: a.club, slug: slugify(a.club), verified: true, members: [{ user: u._id, orgRole: 'owner' }] } },
      { upsert: true, new: true }
    );
    doc.organizationId = org._id;
  }
  await OrganizerApplication.create(doc);
}
console.log('Organizer requests ready (2 pending, 1 approved, 1 rejected).');

// ---------- 4. Events waiting for review, plus a rejected and a draft ----------
const orgBySlug = async (slug) => Organization.findOne({ slug });
const mk = async ({ title, org, by, catSlug, code, off, h1, h2, cap, price = 0, status, desc, note }) => {
  if (!org || await Event.exists({ title })) return false;
  const venue = code ? venueByCode.get(code) : null;
  const cat = categories.find((c) => c.slug === catSlug);
  const shortCode = await nextShortCode();
  await Event.create({
    title, slug: `${slugify(title)}-${shortCode.toLowerCase()}`, shortCode, organizationId: org._id, createdBy: by._id, categoryId: cat?._id ?? null,
    description: desc, mode: 'in_person', venueId: venue?._id ?? null, capacity: cap ?? null,
    ...(off != null ? { startAt: at(off, h1), endAt: at(off, h2), registrationOpensAt: at(off - 10, 9), registrationClosesAt: at(off, h1 - 2) } : {}),
    waitlistEnabled: true, price: { isFree: price === 0, amountINR: price }, status, registeredCount: 0,
    ...(status === 'pending_approval' ? { submittedAt: new Date(now - rnd() * 2 * DAY) } : {}),
    ...(note ? { rejectionNote: note } : {}),
  });
  return true;
};
const clubs = { coding: await orgBySlug('coding-hackathon-club'), enterprise: await orgBySlug('entrepreneurship-cell'), cultural: await orgBySlug('cultural-council'), music: await orgBySlug('music-society') };
const yoga = await orgBySlug('yoga-wellness-club');
let madeEvents = 0;
for (const spec of [
  { title: 'Capture the Flag: Beginner Round', org: clubs.coding, by: organizer, catSlug: 'technology-hackathons', code: 'VNU-SEMHALL-11', off: 22, h1: 10, h2: 14, cap: 100, status: 'pending_approval', desc: 'A beginner-friendly security contest. Teams of three solve puzzles in web, crypto and forensics.' },
  // Same venue and an overlapping time as "Startup Pitch Night" (day 7), so the admin sees a real clash and must decide.
  { title: 'Investor Meetup', org: clubs.enterprise, by: organizer, catSlug: 'business-startups', code: 'VNU-BRMAUD-03', off: 7, h1: 16, h2: 18, cap: 200, status: 'pending_approval', desc: 'Founders meet angel investors for short one-to-one conversations.' },
  { title: 'Yoga and Mindfulness Morning', org: yoga, by: appUsers['Yoga & Wellness Club'], catSlug: 'campus-socials', code: 'VNU-STUCENT-09', off: 21, h1: 6, h2: 8, cap: 120, status: 'pending_approval', desc: 'A guided morning session for beginners. Bring a mat and water.' },
  { title: 'Late Night Gaming Tournament', org: clubs.music, by: organizer, catSlug: 'campus-socials', code: 'VNU-STUCENT-09', off: 9, h1: 22, h2: 23, cap: 80, status: 'rejected', desc: 'Overnight gaming event.', note: 'Events cannot run past 10 pm at this venue. Move it earlier and resubmit.' },
  { title: 'Alumni Mentorship Drive', org: clubs.cultural, by: organizer, catSlug: 'workshops-career', code: null, off: null, cap: null, status: 'draft', desc: 'Pairing final-year students with alumni mentors.' },
]) if (await mk(spec)) madeEvents++;
console.log(`Created ${madeEvents} events for review (pending, rejected, draft).`);

// ---------- 5. Notifications ----------
const recent = (hoursAgo) => new Date(now - hoursAgo * 3600000);
if (!(await Notification.exists({ userId: admin._id, type: 'organizer_request' }))) {
  const pend = await OrganizerApplication.find({ status: 'pending' });
  const toReview = await Event.find({ status: 'pending_approval' }).limit(3);
  await Notification.insertMany([
    ...pend.map((a, i) => ({ userId: admin._id, type: 'organizer_request', title: 'New organizer request', body: a.orgName, link: '/admin/organizers', createdAt: recent(5 + i * 9) })),
    ...toReview.map((e, i) => ({ userId: admin._id, type: 'event_submitted', title: 'New event to review', body: e.title, link: '/admin/review', createdAt: recent(3 + i * 6) })),
  ]);
}
if (studentDev && !(await Notification.exists({ userId: studentDev._id }))) {
  const regs = await Registration.find({ userId: studentDev._id, status: 'registered' }).populate('eventId', 'title').limit(5);
  await Notification.insertMany(regs.filter((r) => r.eventId).map((r, i) => ({ userId: studentDev._id, type: 'registration', title: 'You are registered', body: r.eventId.title, link: '/my-bookings', createdAt: recent(12 + i * 20), readAt: i > 1 ? recent(2) : null })));
}
if (!(await Notification.exists({ userId: organizer._id, type: 'event_rejected' }))) {
  const rej = await Event.findOne({ status: 'rejected', createdBy: organizer._id });
  if (rej) await Notification.create({ userId: organizer._id, type: 'event_rejected', title: 'Your event was rejected', body: rej.rejectionNote, link: `/organizer/events/${rej._id}`, createdAt: recent(20) });
}

// ---------- 6. Make every event's seat count a real count ----------
const grouped = await Registration.aggregate([{ $match: { status: 'registered' } }, { $group: { _id: '$eventId', n: { $sum: 1 } } }]);
const counts = new Map(grouped.map((g) => [String(g._id), g.n]));
const all = await Event.find().select('_id capacity');
await Event.bulkWrite(all.map((e) => ({ updateOne: { filter: { _id: e._id }, update: { $set: { registeredCount: Math.min(counts.get(String(e._id)) || 0, e.capacity ?? Infinity) } } } })));

const [users, regs, evStatus] = await Promise.all([
  User.countDocuments(), Registration.countDocuments({ status: 'registered' }),
  Event.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
]);
console.log(`\nDone. Users: ${users}. Active registrations: ${regs}. Events: ${evStatus.map((s) => `${s._id} ${s.n}`).join(', ')}.`);
await mongoose.disconnect();
