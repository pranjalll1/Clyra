import Event from '@/shared/models/Event.js';
import Venue from '@/shared/models/Venue.js';
import { peakConcurrency } from './overlap.js';

// Statuses that hold a venue slot. Drafts, rejected and cancelled events do not block anything.
export const BLOCKING = ['published', 'pending_approval'];

// Events at the same venue whose time overlaps the given range.
export function findOverlaps({ venueId, startAt, endAt, excludeId = null, statuses = BLOCKING }) {
  if (!venueId || !startAt || !endAt) return [];
  const filter = {
    venueId,
    archivedAt: null,
    status: { $in: statuses },
    startAt: { $lt: new Date(endAt) },
    endAt: { $gt: new Date(startAt) },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Event.find(filter)
    .sort('startAt')
    .select('title shortCode status startAt endAt organizationId')
    .populate('organizationId', 'name')
    .lean();
}

// { clash, units, venueName, overlaps }
// A venue with N units can host N events at once, so there is a clash only if the peak
// number of simultaneous events (the existing ones plus the new one) is above N.
export async function checkVenueClash({ venueId, startAt, endAt, excludeId = null, statuses = BLOCKING }) {
  const venue = await Venue.findById(venueId).select('name units').lean();
  if (!venue) return { clash: false, units: 1, venueName: null, overlaps: [] };
  const units = venue.units || 1;
  const overlapsList = await findOverlaps({ venueId, startAt, endAt, excludeId, statuses });
  const peak = peakConcurrency([...overlapsList, { startAt, endAt }]);
  return { clash: peak > units, units, venueName: venue.name, overlaps: overlapsList };
}

// What we send to the browser about a conflicting event.
export const conflictDto = (e) => ({
  id: e._id.toString(),
  title: e.title,
  shortCode: e.shortCode,
  status: e.status,
  startAt: e.startAt,
  endAt: e.endAt,
  organizationName: e.organizationId?.name ?? null,
});