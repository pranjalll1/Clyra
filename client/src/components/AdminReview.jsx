import { Router } from 'express';
import { z } from 'zod';
import Event from '../models/Event.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { toDto } from '../utils/eventRules.js';
import { BLOCKING, checkVenueClash, conflictDto } from '../utils/clash.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin')); // every route below is admin-only

const isId = (s) => /^[a-f\d]{24}$/i.test(s);
const NOT_PENDING = { error: 'This event is not waiting for review', code: 'NOT_PENDING' };
const rejectSchema = z.object({ note: z.string().trim().min(5, 'Explain what to fix (at least 5 characters)').max(500) });
const approveSchema = z.object({
  overrideReason: z.string().trim().min(5, 'Explain why you are overriding the clash (at least 5 characters)').max(300).optional(),
});

const adminDto = (e) => ({
  ...toDto(e),
  organizationName: e.organizationId?.name ?? null,
  submittedBy: e.createdBy?.name ?? null,
  conflicts: [],
  needsOverride: false,
});

const slotOf = (e) => ({ venueId: e.venueId?._id ?? e.venueId, startAt: e.startAt, endAt: e.endAt, excludeId: e._id });

// Oldest first, so events are reviewed in the order they were submitted.
// For pending events we also attach the venue conflicts, so the admin sees them before deciding.
adminRouter.get('/events', async (req, res, next) => {
  try {
    const status = ['pending_approval', 'published', 'rejected'].includes(req.query.status) ? req.query.status : 'pending_approval';
    const items = await Event.find({ status, archivedAt: null })
      .sort('updatedAt').limit(100)
      .populate('categoryId', 'name').populate('venueId', 'name')
      .populate('organizationId', 'name').populate('createdBy', 'name');

    const out = [];
    for (const e of items) {
      const dto = adminDto(e);
      if (status === 'pending_approval' && e.venueId) {
        const slot = slotOf(e);
        const [all, hard] = await Promise.all([
          checkVenueClash({ ...slot, statuses: BLOCKING }),
          checkVenueClash({ ...slot, statuses: ['published'] }), // only a PUBLISHED clash forces an override
        ]);
        dto.conflicts = all.overlaps.map(conflictDto);
        dto.needsOverride = hard.clash;
      }
      out.push(dto);
    }
    res.json({ items: out });
  } catch (err) { next(err); }
});

adminRouter.post('/events/:id/approve', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: 'Event not found', code: 'NOT_FOUND' });
    const parsed = approveSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message, code: 'BAD_OVERRIDE' });

    const event = await Event.findOne({ _id: req.params.id, status: 'pending_approval' });
    if (!event) return res.status(409).json(NOT_PENDING);

    // Re-check right now: someone else may have been published at this venue since the event was submitted.
    const clash = event.venueId
      ? await checkVenueClash({ venueId: event.venueId, startAt: event.startAt, endAt: event.endAt, excludeId: event._id, statuses: ['published'] })
      : { clash: false, overlaps: [], venueName: null };
    const overrideReason = parsed.data.overrideReason;

    if (clash.clash && !overrideReason) {
      return res.status(409).json({
        error: `${clash.venueName} is already booked by a published event at that time. Approve with an override reason, or reject.`,
        code: 'VENUE_CLASH',
        conflicts: clash.overlaps.map(conflictDto),
      });
    }

    const set = { status: 'published' };
    if (clash.clash) set.conflictOverride = { by: req.user._id, reason: overrideReason, at: new Date() };

    const updated = await Event.findOneAndUpdate(
      { _id: event._id, status: 'pending_approval' },
      { $set: set, $unset: { rejectionNote: 1 } },
      { new: true }
    );
    if (!updated) return res.status(409).json(NOT_PENDING);
    res.json({ event: toDto(updated), overridden: clash.clash });
  } catch (err) { next(err); }
});

adminRouter.post('/events/:id/reject', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: 'Event not found', code: 'NOT_FOUND' });
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message, code: 'BAD_NOTE' });

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, status: 'pending_approval' },
      { $set: { status: 'rejected', rejectionNote: parsed.data.note } },
      { new: true }
    );
    if (!event) return res.status(409).json(NOT_PENDING);
    res.json({ event: toDto(event) });
  } catch (err) { next(err); }
});