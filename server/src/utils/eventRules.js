import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z.coerce.date().nullable();

const base = z
  .object({
    title: z.string().trim().min(3, 'Use at least 3 characters').max(120),
    organizationId: objectId,
    categoryId: objectId.nullable(),
    description: z.string().max(10000),
    mode: z.enum(['in_person', 'online', 'hybrid']),
    venueId: objectId.nullable(),
    startAt: date,
    endAt: date,
    capacity: z.number().int().min(1).max(100000).nullable(),
    waitlistEnabled: z.boolean(),
    waitlistCapPercent: z.number().int().min(0).max(50),
    registrationOpensAt: date,
    registrationClosesAt: date,
    price: z.object({ isFree: z.boolean(), amountINR: z.number().min(0).max(100000) }),
  })
  .partial();

export const createSchema = base.required({ title: true, organizationId: true });
export const patchSchema = base.omit({ organizationId: true });

export const fieldErrors = (zerr) => zerr.flatten().fieldErrors;

// Structural checks across fields. Venue overlap/clash checks come in Slice 3.
export function crossChecks(v, venue) {
  const f = {};
  if (v.startAt && v.endAt && v.endAt <= v.startAt) f.endAt = ['End must be after the start'];
  if (venue && v.capacity && v.capacity > venue.capacity) {
    f.capacity = [`${venue.name} holds ${venue.capacity.toLocaleString('en-IN')} people at most`];
  }
  if (v.registrationClosesAt && v.startAt && v.registrationClosesAt > v.startAt) {
    f.registrationClosesAt = ['Registration must close before the event starts'];
  }
  if (v.registrationOpensAt && v.registrationClosesAt && v.registrationOpensAt >= v.registrationClosesAt) {
    f.registrationOpensAt = ['Registration must open before it closes'];
  }
  return f;
}

// The six fields an event needs before it can be submitted for approval.
export function completeness(e) {
  const checks = {
    title: e.title && e.title.length >= 3,
    category: !!e.categoryId,
    description: !!e.description?.trim(),
    schedule: !!(e.startAt && e.endAt),
    venue: !!e.venueId,
    capacity: !!e.capacity,
  };
  const missing = Object.keys(checks).filter((k) => !checks[k]);
  return { done: 6 - missing.length, total: 6, missing };
}

const ref = (v) => (v && v._id ? v._id.toString() : v ? v.toString() : null);

export function toDto(e) {
  return {
    id: e._id.toString(),
    shortCode: e.shortCode,
    slug: e.slug,
    title: e.title,
    status: e.status,
    organizationId: ref(e.organizationId),
    categoryId: ref(e.categoryId),
    categoryName: e.categoryId?.name ?? null,
    description: e.description,
    mode: e.mode,
    venueId: ref(e.venueId),
    venueName: e.venueId?.name ?? null,
    startAt: e.startAt,
    endAt: e.endAt,
    capacity: e.capacity,
    waitlistEnabled: e.waitlistEnabled,
    waitlistCapPercent: e.waitlistCapPercent,
    registrationOpensAt: e.registrationOpensAt,
    registrationClosesAt: e.registrationClosesAt,
    price: e.price,
    rejectionNote: e.rejectionNote ?? null,
    updatedAt: e.updatedAt,
  };
}
// ---------- Slice 2: public discovery ----------

// Validates the query string of GET /events. Zod also converts "2" to the number 2 and fills in defaults.
export const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().max(300).optional(), // comma-separated slugs, e.g. "tech,music"
  price: z.enum(['free', 'paid']).optional(),
  mode: z.enum(['in_person', 'online', 'hybrid']).optional(),
  venueType: z.enum(['auditorium', 'sports', 'hub', 'academic']).optional(),
  when: z.enum(['all', 'today', 'weekend', 'week']).default('all'),
  sort: z.enum(['soonest', 'newest']).default('soonest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

// Turns a "when" chip into a time window. `to: null` means no upper limit.
export function whenRange(when, now = new Date()) {
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  if (when === 'today') return { from: now, to: endOfDay(now) };

  if (when === 'week') {
    const t = new Date(now);
    t.setDate(t.getDate() + 7);
    return { from: now, to: endOfDay(t) };
  }

  if (when === 'weekend') {
    const day = now.getDay(); // 0 = Sunday ... 6 = Saturday
    if (day === 0) return { from: now, to: endOfDay(now) };           // already Sunday
    const sat = new Date(now);
    sat.setDate(sat.getDate() + (6 - day));
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    const from = day === 6 ? now : new Date(sat.setHours(0, 0, 0, 0)); // already Saturday: start now
    return { from, to: endOfDay(sun) };
  }

  return { from: now, to: null }; // "all" = anything that hasn't ended yet
}

// What a student may see. No organizer-only fields (rejectionNote, createdBy, conflictOverride...).
export function toCardDto(e) {
  return {
    id: e._id.toString(),
    slug: e.slug,
    shortCode: e.shortCode,
    title: e.title,
    posterUrl: e.posterUrl ?? null,
    posterAlt: e.posterAlt ?? null,
    categoryName: e.categoryId?.name ?? null,
    categorySlug: e.categoryId?.slug ?? null,
    venueName: e.venueId?.name ?? null,
    mode: e.mode,
    startAt: e.startAt,
    endAt: e.endAt,
    price: e.price,
    capacity: e.capacity,
    organizationName: e.organizationId?.name ?? null,
  };
}
// ---------- Slice 3: public event detail ----------

// Can a student register right now? Decided on the server so the browser can't be fooled by a wrong clock.
// (No "full" or "registered" yet. Those need the Registration model, which comes in a later slice.)
export function registrationState(e, now = new Date()) {
  if (e.endAt && e.endAt < now) return 'ended';
  if (e.registrationPaused) return 'paused';
  if (e.registrationOpensAt && e.registrationOpensAt > now) return 'not_open_yet';
  if (e.registrationClosesAt && e.registrationClosesAt < now) return 'closed';
  return 'open';
}

// Everything a student may see on the detail page. Still an allow-list: no createdBy, rejectionNote, conflictOverride.
export function toDetailDto(e) {
  const taken = e.registeredCount ?? 0;
  const seatsLeft = e.capacity == null ? null : Math.max(0, e.capacity - taken);

  let state = registrationState(e);
  if (state === 'open' && seatsLeft === 0) state = 'full';

  return {
    ...toCardDto(e),
    description: e.description,
    venueType: e.venueId?.type ?? null,
    venueCapacity: e.venueId?.capacity ?? null,
    waitlistEnabled: e.waitlistEnabled,
    registrationOpensAt: e.registrationOpensAt,
    registrationClosesAt: e.registrationClosesAt,
    seatsLeft,
    registrationState: state,
  };
}