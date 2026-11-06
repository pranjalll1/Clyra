import { Router } from 'express';
import Event, { nextShortCode } from '../models/Event.js';
import Venue from '../models/Venue.js';
import Organization from '../models/Organization.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import Registration from '../models/Registration.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

import {
  createSchema, patchSchema, fieldErrors, crossChecks, completeness, toDto,
  listQuerySchema, whenRange, toCardDto, toDetailDto,registrationState,
} from '../utils/eventRules.js';
export const eventRouter = Router();
export const organizerRouter = Router();

const guard = [requireAuth, requireRole('organizer', 'admin')];
const EDITABLE = ['draft', 'rejected'];

const orgIdsFor = (user) => Organization.find({ 'members.user': user._id }).distinct('_id');

async function canManage(user, event) {
  if (user.role === 'admin') return true;
  if (event.createdBy.equals(user._id) || event.coOrganizers.some((id) => id.equals(user._id))) return true;
  return (await orgIdsFor(user)).some((id) => id.equals(event.organizationId));
}

// Returns the event only if it exists and the caller may manage it (404 otherwise, so ids don't leak).
async function loadManaged(req, res) {
  const event = /^[a-f\d]{24}$/i.test(req.params.id) ? await Event.findById(req.params.id) : null;
  if (!event || !(await canManage(req.user, event))) {
    res.status(404).json({ error: 'Event not found', code: 'NOT_FOUND' });
    return null;
  }
  return event;
}

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
// PUBLIC: student discovery. No `guard`, so visitors can browse without signing in.
eventRouter.get('/', async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Check the filters', fields: fieldErrors(parsed.error) });
    const { q, category, price, mode, venueType, when, sort, page, limit } = parsed.data;

    const { from, to } = whenRange(when);

    // Rules that always apply: only published events that haven't ended yet.
    const base = { status: 'published', archivedAt: null, endAt: { $gte: from } };
    if (to) base.startAt = { $lte: to };
    if (price) base['price.isFree'] = price === 'free';
    if (mode) base.mode = mode;
    if (q) base.title = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (venueType) base.venueId = { $in: await Venue.find({ type: venueType }).distinct('_id') };

    // `base` (without the category filter) is also used for the sidebar counts.
    const filter = { ...base };
    const slugs = category ? category.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10) : [];
    if (slugs.length) filter.categoryId = { $in: await Category.find({ slug: { $in: slugs } }).distinct('_id') };

    const order = sort === 'newest' ? { createdAt: -1, _id: -1 } : { startAt: 1, _id: 1 };

    const [items, total, grouped, categories] = await Promise.all([
      Event.find(filter).sort(order).skip((page - 1) * limit).limit(limit)
        .populate('categoryId', 'name slug').populate('venueId', 'name').populate('organizationId', 'name'),
      Event.countDocuments(filter),
      Event.aggregate([{ $match: base }, { $group: { _id: '$categoryId', n: { $sum: 1 } } }]),
      Category.find().sort('order').lean(),
    ]);

    const counts = new Map(grouped.map((g) => [String(g._id), g.n]));
    res.json({
      items: items.map(toCardDto),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      facets: { categories: categories.map((c) => ({ slug: c.slug, name: c.name, count: counts.get(String(c._id)) || 0 })) },
    });
  } catch (err) { next(err); }
});
// PUBLIC: one event by its URL slug. Only published, non-archived events are visible.
// PUBLIC: one event by its URL slug. Signed-in students also get their own registration status.
eventRouter.get('/by-slug/:slug', optionalAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const notFound = () => res.status(404).json({ error: 'Event not found', code: 'NOT_FOUND' });
    if (!/^[a-z0-9-]{1,100}$/.test(slug)) return notFound();

    const event = await Event.findOne({ slug, status: 'published', archivedAt: null })
      .populate('categoryId', 'name slug')
      .populate('venueId', 'name type capacity')
      .populate('organizationId', 'name');
    if (!event) return notFound();

    const dto = toDetailDto(event);
    dto.myRegistration = null;
    if (req.user) {
      const reg = await Registration.findOne({ eventId: event._id, userId: req.user._id, status: 'registered' });
      if (reg) dto.myRegistration = { id: reg._id.toString(), status: reg.status, registeredAt: reg.createdAt };
    }
    res.json({ event: dto });
  } catch (err) { next(err); }
});// ---------- Slice 4: registration (students only) ----------
const studentOnly = [requireAuth, requireRole('student')];
const isId = (s) => /^[a-f\d]{24}$/i.test(s);
const fail = (res, status, error, code) => res.status(status).json({ error, code });
const NOT_OPEN = {
  ended: 'This event has already ended',
  paused: 'Registration is paused for this event',
  not_open_yet: 'Registration has not opened yet',
  closed: 'Registration is closed for this event',
};

eventRouter.post('/:id/register', studentOnly, async (req, res, next) => {
  const eventId = req.params.id;
  const userId = req.user._id;
  let seatTaken = false;
  const releaseSeat = () => Event.updateOne({ _id: eventId, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });

  try {
    if (!isId(eventId)) return fail(res, 404, 'Event not found', 'NOT_FOUND');
    const event = await Event.findOne({ _id: eventId, status: 'published', archivedAt: null });
    if (!event) return fail(res, 404, 'Event not found', 'NOT_FOUND');

    const state = registrationState(event);
    if (state !== 'open') return fail(res, 409, NOT_OPEN[state], `REG_${state.toUpperCase()}`);

    if (await Registration.exists({ eventId, userId, status: 'registered' })) {
      return fail(res, 409, 'You are already registered for this event', 'ALREADY_REGISTERED');
    }

    // 1) Reserve a seat atomically: succeeds only if there is still room (or capacity is unlimited).
    const reserved = await Event.findOneAndUpdate(
      { _id: eventId, $or: [{ capacity: null }, { $expr: { $lt: [{ $ifNull: ['$registeredCount', 0] }, '$capacity'] } }] },
      { $inc: { registeredCount: 1 } },
      { new: true }
    );
    if (!reserved) return fail(res, 409, 'This event is full', 'FULL');
    seatTaken = true;

    // 2) Re-activate an old cancelled row, or create a new one. If a duplicate sneaks in, give the seat back.
    let reg = await Registration.findOneAndUpdate(
      { eventId, userId, status: 'cancelled' },
      { $set: { status: 'registered', cancelledAt: null } },
      { new: true }
    );
    if (!reg) {
      try {
        reg = await Registration.create({ eventId, userId });
      } catch (err) {
        if (err.code === 11000) {
          await releaseSeat();
          seatTaken = false;
          return fail(res, 409, 'You are already registered for this event', 'ALREADY_REGISTERED');
        }
        throw err;
      }
    }

    seatTaken = false; // success: the seat is now really used
    res.status(201).json({
      registration: { id: reg._id.toString(), status: reg.status, registeredAt: reg.createdAt },
      seatsLeft: reserved.capacity == null ? null : Math.max(0, reserved.capacity - reserved.registeredCount),
    });
  } catch (err) {
    if (seatTaken) await releaseSeat().catch(() => {}); // never leave a seat reserved after a crash
    next(err);
  }
});

eventRouter.delete('/:id/register', studentOnly, async (req, res, next) => {
  try {
    const eventId = req.params.id;
    if (!isId(eventId)) return fail(res, 404, 'Event not found', 'NOT_FOUND');
    const event = await Event.findById(eventId).select('startAt');
    if (!event) return fail(res, 404, 'Event not found', 'NOT_FOUND');
    if (event.startAt && event.startAt <= new Date()) {
      return fail(res, 409, 'You cannot cancel once the event has started', 'TOO_LATE');
    }

    const reg = await Registration.findOneAndUpdate(
      { eventId, userId: req.user._id, status: 'registered' },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );
    if (!reg) return fail(res, 404, 'You are not registered for this event', 'NOT_REGISTERED');

    await Event.updateOne({ _id: eventId, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
// STUDENT: my registrations, split into upcoming / past. `studentOnly` was defined in the Slice 4 block above.
eventRouter.get('/mine/registrations', studentOnly, async (req, res, next) => {
  try {
    const tab = req.query.tab === 'past' ? 'past' : 'upcoming';
    const now = new Date();

    const regs = await Registration.find({ userId: req.user._id, status: 'registered' })
      .populate({
        path: 'eventId',
        populate: [
          { path: 'categoryId', select: 'name slug' },
          { path: 'venueId', select: 'name' },
          { path: 'organizationId', select: 'name' },
        ],
      });

    const rows = regs
      .filter((r) => r.eventId) // skip rows whose event was deleted
      .map((r) => ({
        registrationId: r._id.toString(),
        ticketCode: r.ticketCode,
        registeredAt: r.createdAt,
        event: { ...toCardDto(r.eventId), status: r.eventId.status },
      }));

    const isPast = (row) => row.event.endAt && new Date(row.event.endAt) < now;
    const upcoming = rows.filter((x) => !isPast(x)).sort((a, b) => new Date(a.event.startAt) - new Date(b.event.startAt));
    const past = rows.filter(isPast).sort((a, b) => new Date(b.event.startAt) - new Date(a.event.startAt));

    res.json({
      items: tab === 'past' ? past : upcoming,
      counts: { upcoming: upcoming.length, past: past.length },
    });
  } catch (err) { next(err); }
});
// ---------- Slice 6: gate check-in (organizers/admins who can manage the event) ----------
const attendeeDto = (reg, user) => ({
  registrationId: reg._id.toString(),
  ticketCode: reg.ticketCode,
  name: user?.name ?? 'Unknown',
  email: user?.email ?? null,
  department: user?.department ?? null,
  checkedInAt: reg.checkedInAt,
});

async function checkInStats(eventId) {
  const [registered, checkedIn] = await Promise.all([
    Registration.countDocuments({ eventId, status: 'registered' }),
    Registration.countDocuments({ eventId, status: 'registered', checkedInAt: { $ne: null } }),
  ]);
  return { registered, checkedIn };
}

// Scanner sends "CLYRA:TK-XXXXXXXX". Typed entry may be just "TK-XXXXXXXX". Returns null if it isn't a ticket.
function parseTicket(raw) {
  const code = String(raw || '').trim().toUpperCase().replace(/^CLYRA:/, '');
  return /^TK-[A-Z0-9]{8}$/.test(code) ? code : null;
}

eventRouter.post('/:id/check-in', guard, async (req, res, next) => {
  try {
    const event = await loadManaged(req, res);
    if (!event) return;
    if (event.status !== 'published') return fail(res, 409, 'Only published events can check people in', 'NOT_PUBLISHED');

    const { code, registrationId } = req.body || {};
    let where;
    if (registrationId) {
      if (!isId(String(registrationId))) return res.json({ result: 'invalid' });
      where = { _id: String(registrationId) };
    } else {
      const ticketCode = parseTicket(code);
      if (!ticketCode) return res.json({ result: 'invalid' });
      where = { ticketCode };
    }

    // One atomic step: mark checked in ONLY if this is a live ticket for THIS event that isn't used yet.
    const reg = await Registration.findOneAndUpdate(
      { ...where, eventId: event._id, status: 'registered', checkedInAt: null },
      { $set: { checkedInAt: new Date(), checkedInBy: req.user._id } },
      { new: true }
    );
    if (reg) {
      const user = await User.findById(reg.userId).select('name email department');
      return res.json({ result: 'valid', attendee: attendeeDto(reg, user), stats: await checkInStats(event._id) });
    }

    // It did not match, so work out why (this is only for the message shown at the gate).
    const existing = await Registration.findOne(where);
    if (!existing) return res.json({ result: 'invalid' });
    if (!existing.eventId.equals(event._id)) return res.json({ result: 'wrong_event' });
    if (existing.status !== 'registered') return res.json({ result: 'cancelled' });
    const user = await User.findById(existing.userId).select('name email department');
    res.json({ result: 'duplicate', attendee: attendeeDto(existing, user), stats: await checkInStats(event._id) });
  } catch (err) { next(err); }
});

eventRouter.get('/:id/roster', guard, async (req, res, next) => {
  try {
    const event = await loadManaged(req, res);
    if (!event) return;

    const filter = { eventId: event._id, status: 'registered' };
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const userIds = await User.find({ $or: [{ name: rx }, { email: rx }] }).distinct('_id');
      filter.$or = [{ ticketCode: rx }, { userId: { $in: userIds } }];
    }

    const [regs, stats] = await Promise.all([
      Registration.find(filter).sort({ createdAt: 1 }).limit(100).populate('userId', 'name email department'),
      checkInStats(event._id),
    ]);
    res.json({
      event: { id: event._id.toString(), title: event.title, shortCode: event.shortCode, capacity: event.capacity, startAt: event.startAt, endAt: event.endAt },
      items: regs.map((r) => attendeeDto(r, r.userId)),
      stats,
    });
  } catch (err) { next(err); }
});

eventRouter.delete('/:id/check-in/:registrationId', guard, async (req, res, next) => {
  try {
    const event = await loadManaged(req, res);
    if (!event) return;
    if (!isId(req.params.registrationId)) return fail(res, 404, 'Registration not found', 'NOT_FOUND');

    const reg = await Registration.findOneAndUpdate(
      { _id: req.params.registrationId, eventId: event._id, checkedInAt: { $ne: null } },
      { $set: { checkedInAt: null, checkedInBy: null } }
    );
    if (!reg) return fail(res, 404, 'That attendee is not checked in', 'NOT_CHECKED_IN');
    res.json({ ok: true, stats: await checkInStats(event._id) });
  } catch (err) { next(err); }
});

eventRouter.post('/', guard, async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Check the highlighted fields', fields: fieldErrors(parsed.error) });
    const data = parsed.data;

    const isMember = req.user.role === 'admin' || (await orgIdsFor(req.user)).some((id) => id.equals(data.organizationId));
    if (!isMember) return res.status(403).json({ error: 'You are not a member of that organization', code: 'FORBIDDEN' });

    const venue = data.venueId ? await Venue.findById(data.venueId) : null;
    const fields = crossChecks(data, venue);
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Check the highlighted fields', fields });

    const shortCode = await nextShortCode();
    const event = await Event.create({
      ...data,
      createdBy: req.user._id,
      shortCode,
      slug: `${slugify(data.title) || 'event'}-${shortCode.toLowerCase()}`,
    });
    res.status(201).json({ event: toDto(event), completeness: completeness(event) });
  } catch (err) { next(err); }
});

eventRouter.get('/:id', guard, async (req, res, next) => {
  try {
    const event = await loadManaged(req, res);
    if (event) res.json({ event: toDto(event), completeness: completeness(event) });
  } catch (err) { next(err); }
});

eventRouter.patch('/:id', guard, async (req, res, next) => {
  try {
    const event = await loadManaged(req, res);
    if (!event) return;
    if (!EDITABLE.includes(event.status)) {
      return res.status(409).json({ error: 'Only drafts and rejected events can be edited', code: 'NOT_EDITABLE' });
    }
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Check the highlighted fields', fields: fieldErrors(parsed.error) });

    const merged = { ...event.toObject(), ...parsed.data };
    const venue = merged.venueId ? await Venue.findById(merged.venueId) : null;
    const fields = crossChecks(merged, venue);
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Check the highlighted fields', fields });

    event.set(parsed.data);
    await event.save();
    res.json({ event: toDto(event), completeness: completeness(event) });
  } catch (err) { next(err); }
});

organizerRouter.get('/events', guard, async (req, res, next) => {
  try {
    const orgIds = await orgIdsFor(req.user);
    const scope = req.user.role === 'admin'
      ? { archivedAt: null }
      : { archivedAt: null, $or: [{ organizationId: { $in: orgIds } }, { createdBy: req.user._id }] };

    const filter = { ...scope };
    if (req.query.status && req.query.status !== 'all') filter.status = String(req.query.status);
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$and = [{ $or: [{ title: rx }, { shortCode: rx }] }];
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const [items, total, grouped] = await Promise.all([
      Event.find(filter).sort('-updatedAt').skip((page - 1) * limit).limit(limit).populate('venueId', 'name').populate('categoryId', 'name'),
      Event.countDocuments(filter),
      Event.aggregate([{ $match: scope }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);

    const counts = { all: 0 };
    for (const g of grouped) { counts[g._id] = g.n; counts.all += g.n; }
    res.json({ items: items.map(toDto), total, page, limit, counts });
  } catch (err) { next(err); }
});
