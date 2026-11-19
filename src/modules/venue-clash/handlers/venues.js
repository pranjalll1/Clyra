import Venue from '@/shared/models/Venue.js';
import { checkVenueClash, findOverlaps, conflictDto } from '../services/clash.js';
import { jsonError, jsonOk } from '@/shared/server/response.js';

const isId = (s) => /^[a-f\d]{24}$/i.test(String(s || ''));
const badQuery = () => jsonError('Send a valid venue and time range', 400, { code: 'BAD_QUERY' });

export async function listVenues() {
  const items = await Venue.find({ isActive: true }).sort('name').lean();
  return jsonOk({ items: items.map(({ _id, ...v }) => ({ id: _id.toString(), ...v })) });
}

export async function clashCheckVenue(venueId, searchParams) {
  const startAt = new Date(searchParams.get('startAt'));
  const endAt = new Date(searchParams.get('endAt'));
  if (!isId(venueId) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return badQuery();
  }

  const excludeId = isId(searchParams.get('excludeEventId')) ? searchParams.get('excludeEventId') : null;
  const r = await checkVenueClash({ venueId, startAt, endAt, excludeId });
  return jsonOk({ clash: r.clash, units: r.units, conflicts: r.overlaps.map(conflictDto) });
}

export async function venueSchedule(venueId, searchParams) {
  if (!isId(venueId)) return badQuery();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const from = fromParam ? new Date(fromParam) : new Date();
  const to = toParam ? new Date(toParam) : new Date(from.getTime() + 14 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to - from > 62 * 86400000) {
    return badQuery();
  }

  const venue = await Venue.findById(venueId).select('code name location type capacity units amenities').lean();
  if (!venue) return jsonError('Venue not found', 404, { code: 'NOT_FOUND' });

  const bookings = await findOverlaps({ venueId, startAt: from, endAt: to });
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
