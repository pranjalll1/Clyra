import { z } from 'zod';
import Event from '@/shared/models/Event.js';
import User from '@/shared/models/User.js';
import Venue from '@/shared/models/Venue.js';
import OrganizerApplication from '@/shared/models/OrganizerApplication.js';
import Registration from '@/shared/models/Registration.js';
import { toDto } from '@/shared/lib/eventRules.js';
// Module 3 exports
import { BLOCKING, checkVenueClash, conflictDto } from '@/modules/venue-clash/index.js';
import { notify } from '@/shared/server/notify.js';
import { jsonError, jsonOk } from '@/shared/server/response.js';

const isId = (s) => /^[a-f\d]{24}$/i.test(String(s || ''));
const NOT_PENDING = { error: 'This event is not waiting for review', code: 'NOT_PENDING' };
const rejectSchema = z.object({
  note: z.string().trim().min(5, 'Explain what to fix (at least 5 characters)').max(500),
});
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

const slotOf = (e) => ({
  venueId: e.venueId?._id ?? e.venueId,
  startAt: e.startAt,
  endAt: e.endAt,
  excludeId: e._id,
});

export async function listAdminReviewEvents(searchParams) {
  const statusParam = searchParams.get('status');
  const status = ['pending_approval', 'published', 'rejected'].includes(statusParam)
    ? statusParam
    : 'pending_approval';

  const items = await Event.find({ status, archivedAt: null })
    .sort('updatedAt')
    .limit(100)
    .populate('categoryId', 'name')
    .populate('venueId', 'name')
    .populate('organizationId', 'name')
    .populate('createdBy', 'name');

  const out = [];
  for (const e of items) {
    const dto = adminDto(e);
    if (status === 'pending_approval' && e.venueId) {
      const slot = slotOf(e);
      const [all, hard] = await Promise.all([
        checkVenueClash({ ...slot, statuses: BLOCKING }),
        checkVenueClash({ ...slot, statuses: ['published'] }),
      ]);
      dto.conflicts = all.overlaps.map(conflictDto);
      dto.needsOverride = hard.clash;
    }
    out.push(dto);
  }

  return jsonOk({ items: out });
}

export async function approveEvent(id, adminUser, body) {
  if (!isId(id)) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });
  const parsed = approveSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400, { code: 'BAD_OVERRIDE' });
  }

  const event = await Event.findOne({ _id: id, status: 'pending_approval' });
  if (!event) return jsonError(NOT_PENDING.error, 409, { code: NOT_PENDING.code });

  // Re-check right now against published events
  const clash = event.venueId
    ? await checkVenueClash({
        venueId: event.venueId,
        startAt: event.startAt,
        endAt: event.endAt,
        excludeId: event._id,
        statuses: ['published'],
      })
    : { clash: false, overlaps: [], venueName: null };

  const overrideReason = parsed.data.overrideReason;

  if (clash.clash && !overrideReason) {
    return jsonError(
      `${clash.venueName} is already booked by a published event at that time. Approve with an override reason, or reject.`,
      409,
      {
        code: 'VENUE_CLASH',
        conflicts: clash.overlaps.map(conflictDto),
      }
    );
  }

  const set = { status: 'published' };
  if (clash.clash) set.conflictOverride = { by: adminUser._id, reason: overrideReason, at: new Date() };

  const updated = await Event.findOneAndUpdate(
    { _id: event._id, status: 'pending_approval' },
    { $set: set, $unset: { rejectionNote: 1 } },
    { new: true }
  );
  if (!updated) return jsonError(NOT_PENDING.error, 409, { code: NOT_PENDING.code });

  notify(updated.createdBy, {
    type: 'event_approved',
    title: 'Your event was approved',
    body: updated.title,
    link: '/organizer',
    email: true,
  });

  return jsonOk({ event: toDto(updated), overridden: clash.clash });
}

export async function rejectEvent(id, _adminUser, body) {
  if (!isId(id)) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400, { code: 'BAD_NOTE' });
  }

  const event = await Event.findOneAndUpdate(
    { _id: id, status: 'pending_approval' },
    { $set: { status: 'rejected', rejectionNote: parsed.data.note } },
    { new: true }
  );
  if (!event) return jsonError(NOT_PENDING.error, 409, { code: NOT_PENDING.code });

  notify(event.createdBy, {
    type: 'event_rejected',
    title: 'Your event was rejected',
    body: parsed.data.note,
    link: `/organizer/events/${event._id}`,
    email: true,
  });

  return jsonOk({ event: toDto(event) });
}

export async function getAdminDashboardStats() {
  const [
    pendingOrganizers,
    pendingEvents,
    publishedEvents,
    totalEvents,
    organizers,
    students,
    venues,
    registrations,
  ] = await Promise.all([
    OrganizerApplication.countDocuments({ status: 'pending' }),
    Event.countDocuments({ status: 'pending_approval', archivedAt: null }),
    Event.countDocuments({ status: 'published', archivedAt: null }),
    Event.countDocuments({ archivedAt: null }),
    User.countDocuments({ role: 'organizer' }),
    User.countDocuments({ role: 'student' }),
    Venue.countDocuments({ isActive: true }),
    Registration.countDocuments({ status: 'registered' }),
  ]);

  return jsonOk({
    pendingOrganizers,
    pendingEvents,
    publishedEvents,
    totalEvents,
    organizers,
    students,
    venues,
    registrations,
  });
}
