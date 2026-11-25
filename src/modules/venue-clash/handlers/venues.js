// Unit III: Venue API Handlers
// Handles listing active venues, live clash checking, and venue timetable schedules
import Venue from '@/shared/models/Venue.js';
import { checkVenueClash, findOverlaps, conflictDto } from '../services/clash.js';
import { jsonError, jsonOk } from '@/shared/server/response.js';

// Time constants in milliseconds
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SCHEDULE_WINDOW = 14 * ONE_DAY_MS; // 14 days default schedule
const MAX_SCHEDULE_WINDOW = 62 * ONE_DAY_MS;      // 62 days max query window

// Helper to validate standard 24-character hex MongoDB ObjectIds
function isValidMongoId(id) {
  return /^[a-f\d]{24}$/i.test(String(id || ''));
}

/**
 * GET /api/v1/venues
 * Returns all active campus venues sorted alphabetically by name.
 */
export async function listVenues() {
  const venues = await Venue.find({ isActive: true }).sort('name').lean();

  const formattedVenues = venues.map((v) => ({
    id: v._id.toString(),
    code: v.code,
    name: v.name,
    location: v.location,
    type: v.type,
    capacity: v.capacity,
    units: v.units || 1,
    amenities: v.amenities,
    isActive: v.isActive,
  }));

  return jsonOk({ items: formattedVenues });
}

/**
 * GET /api/v1/venues/:id/clash-check?startAt=...&endAt=...&excludeEventId=...
 * Live preview endpoint called by event creation form to notify organizer of clashes.
 */
export async function clashCheckVenue(venueId, searchParams) {
  if (!isValidMongoId(venueId)) {
    return jsonError('Invalid venue ID provided', 400, { code: 'BAD_QUERY' });
  }

  const startAt = new Date(searchParams.get('startAt'));
  const endAt = new Date(searchParams.get('endAt'));

  // Validate start and end timestamps
  const isStartTimeValid = !Number.isNaN(startAt.getTime());
  const isEndTimeValid = !Number.isNaN(endAt.getTime());

  if (!isStartTimeValid || !isEndTimeValid || endAt <= startAt) {
    return jsonError('Please provide a valid start and end time range where end is after start', 400, {
      code: 'BAD_QUERY',
    });
  }

  const excludeEventIdParam = searchParams.get('excludeEventId');
  const excludeId = isValidMongoId(excludeEventIdParam) ? excludeEventIdParam : null;

  // Run clash check
  const result = await checkVenueClash({
    venueId,
    startAt,
    endAt,
    excludeId,
  });

  return jsonOk({
    clash: result.clash,
    units: result.units,
    conflicts: result.overlaps.map(conflictDto),
  });
}

/**
 * GET /api/v1/venues/:id/schedule?from=...&to=...
 * Returns booked events for a venue within a date window for the timetable view.
 */
export async function venueSchedule(venueId, searchParams) {
  if (!isValidMongoId(venueId)) {
    return jsonError('Invalid venue ID provided', 400, { code: 'BAD_QUERY' });
  }

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  // Default to today and 14 days ahead if not specified
  const from = fromParam ? new Date(fromParam) : new Date();
  const to = toParam ? new Date(toParam) : new Date(from.getTime() + DEFAULT_SCHEDULE_WINDOW);

  const isFromValid = !Number.isNaN(from.getTime());
  const isToValid = !Number.isNaN(to.getTime());
  const isWindowExceeded = to - from > MAX_SCHEDULE_WINDOW;

  if (!isFromValid || !isToValid || to <= from || isWindowExceeded) {
    return jsonError('Please provide a valid schedule date range (max 62 days)', 400, {
      code: 'BAD_QUERY',
    });
  }

  const venue = await Venue.findById(venueId)
    .select('code name location type capacity units amenities')
    .lean();

  if (!venue) {
    return jsonError('Venue not found', 404, { code: 'NOT_FOUND' });
  }

  const bookings = await findOverlaps({
    venueId,
    startAt: from,
    endAt: to,
  });

  return jsonOk({
    venue: {
      id: venue._id.toString(),
      code: venue.code,
      name: venue.name,
      location: venue.location,
      type: venue.type,
      capacity: venue.capacity,
      units: venue.units || 1,
    },
    from,
    to,
    bookings: bookings.map(conflictDto),
  });
}
