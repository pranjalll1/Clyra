import { Router } from 'express';
import Category from '../models/Category.js';
import Venue from '../models/Venue.js';
import Organization from '../models/Organization.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { checkVenueClash, findOverlaps, conflictDto } from '../utils/clash.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';

const router = Router();
const staff = [requireAuth, requireRole('organizer', 'admin')];
const isId = (s) => /^[a-f\d]{24}$/i.test(String(s || ''));
const badQuery = (res) => res.status(400).json({ error: 'Send a valid venue and time range', code: 'BAD_QUERY' });

router.get('/categories', async (_req, res, next) => {
  try {
    res.json({ items: await Category.find().sort('order').lean() });
  } catch (err) { next(err); }
});

router.get('/venues', async (_req, res, next) => {
  try {
    const items = await Venue.find({ isActive: true }).sort('name').lean();
    res.json({ items: items.map(({ _id, ...v }) => ({ id: _id.toString(), ...v })) });
  } catch (err) { next(err); }
});

// Module 3: is this venue free for this time? Used live by the event form.
// GET /venues/:id/clash-check?startAt=ISO&endAt=ISO&excludeEventId=ID
router.get('/venues/:id/clash-check', staff, async (req, res, next) => {
  try {
    const startAt = new Date(req.query.startAt);
    const endAt = new Date(req.query.endAt);
    if (!isId(req.params.id) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) return badQuery(res);

    const excludeId = isId(req.query.excludeEventId) ? req.query.excludeEventId : null;
    const r = await checkVenueClash({ venueId: req.params.id, startAt, endAt, excludeId });
    res.json({ clash: r.clash, units: r.units, conflicts: r.overlaps.map(conflictDto) });
  } catch (err) { next(err); }
});

// Module 3: every booking of one venue in a window (default: the next 14 days). Powers the availability page.
// GET /venues/:id/schedule?from=ISO&to=ISO
router.get('/venues/:id/schedule', staff, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return badQuery(res);
    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to = req.query.to ? new Date(req.query.to) : new Date(from.getTime() + 14 * 86400000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to - from > 62 * 86400000) return badQuery(res);

    const venue = await Venue.findById(req.params.id).select('code name location type capacity units amenities').lean();
    if (!venue) return res.status(404).json({ error: 'Venue not found', code: 'NOT_FOUND' });

    const bookings = await findOverlaps({ venueId: req.params.id, startAt: from, endAt: to });
    res.json({
      venue: { id: venue._id.toString(), code: venue.code, name: venue.name, location: venue.location, type: venue.type, capacity: venue.capacity, units: venue.units || 1 },
      from,
      to,
      bookings: bookings.map(conflictDto),
    });
  } catch (err) { next(err); }
});
// Public numbers for the landing page.
router.get('/stats', async (_req, res, next) => {
  try {
    const [events, clubs, venues, registrations] = await Promise.all([
      Event.countDocuments({ status: 'published', archivedAt: null, endAt: { $gte: new Date() } }),
      Organization.countDocuments(),
      Venue.countDocuments({ isActive: true }),
      Registration.countDocuments({ status: 'registered' }),
    ]);
    res.json({ events, clubs, venues, registrations });
  } catch (err) { next(err); }
});

router.get('/organizations/mine', requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { 'members.user': req.user._id };
    const orgs = await Organization.find(filter).sort('name').lean();
    res.json({ items: orgs.map((o) => ({ id: o._id.toString(), name: o.name, verified: o.verified })) });
  } catch (err) { next(err); }
});

export default router;