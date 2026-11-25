// Unit III & IV: Venue Clash Detection Service
// Queries MongoDB for overlapping bookings and checks peak capacity against venue units
import Event from '@/shared/models/Event.js';
import Venue from '@/shared/models/Venue.js';
import { peakConcurrency } from './overlap.js';

// Only published and pending events occupy venue slots.
// Drafts, rejected, or cancelled events never block a venue.
export const BLOCKING = ['published', 'pending_approval'];

/**
 * Finds all existing events booked at this venue that overlap the proposed time range.
 */
export async function findOverlaps({ venueId, startAt, endAt, excludeId = null, statuses = BLOCKING }) {
  if (!venueId || !startAt || !endAt) {
    return [];
  }

  // An existing event overlaps if it starts before our proposed end
  // AND ends after our proposed start.
  const query = {
    venueId,
    archivedAt: null,
    status: { $in: statuses },
    startAt: { $lt: new Date(endAt) },
    endAt: { $gt: new Date(startAt) },
  };

  // When updating an existing event, exclude itself from its own clash check
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return await Event.find(query)
    .sort('startAt')
    .select('title shortCode status startAt endAt organizationId')
    .populate('organizationId', 'name')
    .lean();
}

/**
 * Core clash check function:
 * Retrieves venue details and uses the line-sweep algorithm to check
 * if adding the candidate event exceeds the venue's available units.
 */
export async function checkVenueClash({ venueId, startAt, endAt, excludeId = null, statuses = BLOCKING }) {
  const venue = await Venue.findById(venueId).select('name units').lean();

  if (!venue) {
    return { clash: false, units: 1, venueName: null, overlaps: [] };
  }

  const units = venue.units || 1;
  const existingOverlaps = await findOverlaps({ venueId, startAt, endAt, excludeId, statuses });

  // Calculate peak concurrency with existing events PLUS the candidate event
  const allEventsInWindow = [...existingOverlaps, { startAt, endAt }];
  const peak = peakConcurrency(allEventsInWindow);

  // A clash occurs if simultaneous events exceed venue units
  const hasClash = peak > units;

  return {
    clash: hasClash,
    units,
    venueName: venue.name,
    overlaps: existingOverlaps,
  };
}

/**
 * Formats a conflicting event object for the client API response
 */
export function formatConflict(event) {
  return {
    id: event._id.toString(),
    title: event.title,
    shortCode: event.shortCode,
    status: event.status,
    startAt: event.startAt,
    endAt: event.endAt,
    organizationName: event.organizationId?.name || null,
  };
}

// Keep export alias for compatibility across eventService and adminService
export const conflictDto = formatConflict;
