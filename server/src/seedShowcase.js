// Adds a realistic set of DEMO clubs and events so the app looks lived-in.
// Safe to run more than once. Re-run after adding poster images to attach them.
// Club and event names are demo data: rename them to real ones before a public launch.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { config } from './config.js';
import Event, { nextShortCode } from './models/Event.js';
import Organization from './models/Organization.js';
import Category from './models/Category.js';
import Venue from './models/Venue.js';
import User from './models/User.js';

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const POSTER_DIR = fileURLToPath(new URL('../../client/public/images/events/', import.meta.url));
const posterFor = (categorySlug) => {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (fs.existsSync(`${POSTER_DIR}${categorySlug}.${ext}`)) return `/images/events/${categorySlug}.${ext}`;
  }
  return null;
};

const clubs = [
  ['Coding & Hackathon Club', 'Builds, ships and competes: hackathons, workshops and open-source sprints.'],
  ['Cultural Council', 'Organizes the big cultural evenings, dance, drama and fine-arts showcases.'],
  ['Entrepreneurship Cell', 'Pitch nights, founder talks and startup mentoring.'],
  ['Sports Council', 'Inter-department tournaments and open sports days.'],
  ['Music Society', 'Open mics, band nights and live performances.'],
  ['Photography & Film Club', 'Photo walks, screenings and filmmaking workshops.'],
  ['Robotics Society', 'Hands-on electronics, robotics and automation.'],
  ['Literary & Debating Society', 'Debates, quizzes, writing and public speaking.'],
];

// [title, categorySlug, venueCode|null, mode, dayOffset, startHour, hours, priceINR, capacity, clubIndex, registered, description]
const events = [
  ['Hack the Campus 24', 'technology-hackathons', 'VNU-SEMHALL-11', 'in_person', 3, 10, 24, 0, 180, 0, 142, 'A 24-hour team hackathon. Form a team of up to four, build a working prototype, and pitch it to a panel of mentors. Prizes for the top three teams.'],
  ['Open Mic Night', 'live-music-concerts', 'VNU-STUCENT-09', 'in_person', 4, 18, 3, 0, 400, 4, 260, 'Sing, play, recite or stand-up. Sign up on the day for a five-minute slot, or just come and cheer.'],
  ['Intro to Cloud & DevOps Workshop', 'workshops-career', 'VNU-SEMHALL-11', 'in_person', 5, 14, 3, 0, 120, 0, 87, 'Hands-on session: containers, CI/CD and deploying a small app. Bring a laptop with Docker installed.'],
  ['Inter-Department Football Cup', 'sports-tournaments', 'VNU-XLARENA-07', 'in_person', 6, 16, 4, 0, 700, 3, 412, 'Seven-a-side knockout between departments. Teams register through their department coordinators.'],
  ['Startup Pitch Night', 'business-startups', 'VNU-BRMAUD-03', 'hybrid', 7, 15, 3, 100, 400, 2, 198, 'Ten student teams pitch to a panel of founders and investors. Join in person or follow the live stream.'],
  ['Campus Photo Walk', 'creative-arts-culture', 'VNU-STUCENT-09', 'in_person', 8, 7, 3, 0, 60, 5, 41, 'A guided sunrise walk with tips on composition and light. Any camera, phones welcome.'],
  ['Rangmanch: Annual Cultural Evening', 'creative-arts-culture', 'VNU-SDMAUD-02', 'in_person', 9, 17, 4, 150, 2000, 1, 1260, 'Dance, drama, music and fashion in one evening. Seats are limited, register early.'],
  ['Line Follower Robot Workshop', 'workshops-career', 'VNU-SEMHALL-11', 'in_person', 10, 11, 4, 200, 80, 6, 56, 'Build and tune a line-following robot from a kit. Kits are provided and stay with the team.'],
  ['Debate Championship Finals', 'creative-arts-culture', 'VNU-MOOTCRT-12', 'in_person', 11, 10, 5, 0, 90, 7, 63, 'The final four teams argue the motion before a panel of faculty judges. The audience votes too.'],
  ['Resume & Interview Clinic', 'workshops-career', 'VNU-SEMHALL-11', 'in_person', 12, 10, 3, 0, 150, 2, 101, 'Get your resume reviewed one-to-one and practise a mock interview with industry volunteers.'],
  ['EDM Night Live', 'live-music-concerts', 'VNU-OAA-04', 'in_person', 13, 19, 4, 250, 1500, 4, 980, 'Open-air electronic music night with three student DJs and a headline act.'],
  ['Badminton Doubles Open', 'sports-tournaments', 'VNU-INDSTAD-05', 'in_person', 14, 9, 8, 0, 300, 3, 120, 'Open doubles tournament with separate brackets for beginners and advanced players.'],
  ['Inter-College Cricket Sixes', 'sports-tournaments', 'VNU-CRICKET-06', 'in_person', 15, 9, 8, 50, 2000, 3, 640, 'Six-a-side, six-over matches across the day. Entry fee covers refreshments.'],
  ['Founders Talk: From Idea to MVP', 'business-startups', 'VNU-BRMAUD-03', 'in_person', 16, 16, 2, 0, 450, 2, 175, 'Two founders share how they validated an idea, built a first version and found their first users.'],
  ['AI & Data Science Bootcamp', 'technology-hackathons', null, 'online', 17, 18, 2, 0, 500, 0, 233, 'An evening online session: a guided notebook from raw data to a working model. Link shared after registration.'],
  ["Freshers' Social Mixer", 'campus-socials', 'VNU-UNIMALL-08', 'in_person', 18, 17, 3, 0, 1500, 1, 505, 'Games, music and food to meet people from other departments and years.'],
  ['Film Screening & Discussion', 'creative-arts-culture', 'VNU-BRMAUD-03', 'in_person', 19, 18, 3, 0, 400, 5, 160, 'A short-film screening followed by an open discussion with the filmmakers.'],
  ['Alumni Meet & Career Panel', 'campus-socials', 'VNU-SDMAUD-02', 'in_person', 20, 15, 3, 0, 1800, 7, 320, 'Alumni from different fields talk about their first jobs and answer your questions.'],
  // Past events: they stay in the database but are hidden from discovery.
  ['Orientation Day', 'campus-socials', 'VNU-SDMAUD-02', 'in_person', -12, 10, 4, 0, 2000, 1, 1850, 'Welcome session for new students.'],
  ['Code Sprint 2.0', 'technology-hackathons', 'VNU-SEMHALL-11', 'in_person', -20, 10, 6, 0, 150, 0, 150, 'A six-hour coding contest.'],
];

await mongoose.connect(config.mongoUri);

const organizer = await User.findOne({ email: 'organizer.dev@lpu.in' }) || await User.findOne({ role: { $in: ['organizer', 'admin'] } });
if (!organizer) throw new Error('No organizer or admin user found. Run `npm run seed` first.');

const categories = new Map((await Category.find()).map((c) => [c.slug, c]));
const venues = new Map((await Venue.find()).map((v) => [v.code, v]));
if (!categories.size || !venues.size) throw new Error('Run `npm run seed` first (categories or venues are missing).');

const orgs = [];
for (const [name, description] of clubs) {
  const slug = slugify(name);
  const existing = await Organization.findOne({ slug });
  if (existing) { orgs.push(existing); continue; }
  orgs.push(await Organization.create({ name, slug, description, verified: true, members: [{ user: organizer._id, orgRole: 'owner' }] }));
}

let created = 0, updated = 0, failed = 0;
const day = 24 * 60 * 60 * 1000;
const base = new Date(); base.setMinutes(0, 0, 0);

for (const [title, catSlug, venueCode, mode, off, hour, hours, price, capacity, club, registered, description] of events) {
  const cat = categories.get(catSlug);
  const venue = venueCode ? venues.get(venueCode) : null;
  if (!cat || (venueCode && !venue)) { console.warn(`skipped "${title}": category or venue missing`); failed++; continue; }

  const poster = posterFor(catSlug);
  const existing = await Event.findOne({ title });
  if (existing) {
    if (poster && !existing.posterUrl) { existing.posterUrl = poster; existing.posterAlt = `Poster for ${title}`; await existing.save(); updated++; }
    continue;
  }

  const startAt = new Date(base); startAt.setDate(startAt.getDate() + off); startAt.setHours(hour, 0, 0, 0);
  const endAt = new Date(startAt.getTime() + hours * 60 * 60 * 1000);
  try {
    const shortCode = await nextShortCode();
    await Event.create({
      title, slug: `${slugify(title)}-${shortCode.toLowerCase()}`, shortCode,
      organizationId: orgs[club]._id, createdBy: organizer._id, categoryId: cat._id,
      description, mode, venueId: venue?._id ?? null, startAt, endAt,
      capacity: venue ? Math.min(capacity, venue.capacity) : capacity,
      waitlistEnabled: true,
      registrationOpensAt: new Date(startAt.getTime() - 14 * day),
      registrationClosesAt: new Date(startAt.getTime() - 2 * 60 * 60 * 1000),
      price: { isFree: price === 0, amountINR: price },
      status: 'published', registeredCount: Math.min(registered, capacity),
      ...(poster ? { posterUrl: poster, posterAlt: `Poster for ${title}` } : {}),
    });
    created++;
  } catch (err) {
    failed++;
    console.warn(`could not create "${title}": ${err.message}`);
  }
}

console.log(`Clubs: ${orgs.length}. Events created: ${created}, posters attached to existing: ${updated}, failed: ${failed}.`);
await mongoose.disconnect();
