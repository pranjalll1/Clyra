import Registration from '@/shared/models/Registration.js';
import User from '@/shared/models/User.js';
import { loadManaged } from './eventService.js';
import { jsonError, jsonOk } from '@/shared/server/response.js';

const isId = (s) => /^[a-f\d]{24}$/i.test(String(s || ''));

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

function parseTicket(raw) {
  const code = String(raw || '').trim().toUpperCase().replace(/^CLYRA:/, '');
  return /^TK-[A-Z0-9]{8}$/.test(code) ? code : null;
}

export async function checkInAttendee(eventId, user, body) {
  const event = await loadManaged(eventId, user);
  if (!event) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });
  if (event.status !== 'published') {
    return jsonError('Only published events can check people in', 409, { code: 'NOT_PUBLISHED' });
  }

  const { code, registrationId } = body || {};
  let where;
  if (registrationId) {
    if (!isId(String(registrationId))) return jsonOk({ result: 'invalid' });
    where = { _id: String(registrationId) };
  } else {
    const ticketCode = parseTicket(code);
    if (!ticketCode) return jsonOk({ result: 'invalid' });
    where = { ticketCode };
  }

  // One atomic step: mark checked in ONLY if this is a live ticket for THIS event that isn't used yet.
  const reg = await Registration.findOneAndUpdate(
    { ...where, eventId: event._id, status: 'registered', checkedInAt: null },
    { $set: { checkedInAt: new Date(), checkedInBy: user._id } },
    { new: true }
  );
  if (reg) {
    const attendeeUser = await User.findById(reg.userId).select('name email department');
    return jsonOk({ result: 'valid', attendee: attendeeDto(reg, attendeeUser), stats: await checkInStats(event._id) });
  }

  // It did not match, so work out why
  const existing = await Registration.findOne(where);
  if (!existing) return jsonOk({ result: 'invalid' });
  if (!existing.eventId.equals(event._id)) return jsonOk({ result: 'wrong_event' });
  if (existing.status !== 'registered') return jsonOk({ result: 'cancelled' });
  const attendeeUser = await User.findById(existing.userId).select('name email department');
  return jsonOk({ result: 'duplicate', attendee: attendeeDto(existing, attendeeUser), stats: await checkInStats(event._id) });
}

export async function getAttendeeRoster(eventId, user, searchParams) {
  const event = await loadManaged(eventId, user);
  if (!event) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });

  const filter = { eventId: event._id, status: 'registered' };
  const q = String(searchParams.get('q') || '').trim().slice(0, 60);
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const userIds = await User.find({ $or: [{ name: rx }, { email: rx }] }).distinct('_id');
    filter.$or = [{ ticketCode: rx }, { userId: { $in: userIds } }];
  }

  const [regs, stats] = await Promise.all([
    Registration.find(filter).sort({ createdAt: 1 }).limit(100).populate('userId', 'name email department'),
    checkInStats(event._id),
  ]);

  return jsonOk({
    event: {
      id: event._id.toString(),
      title: event.title,
      shortCode: event.shortCode,
      capacity: event.capacity,
      startAt: event.startAt,
      endAt: event.endAt,
    },
    items: regs.map((r) => attendeeDto(r, r.userId)),
    stats,
  });
}

export async function undoCheckIn(eventId, registrationId, user) {
  const event = await loadManaged(eventId, user);
  if (!event) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });
  if (!isId(registrationId)) return jsonError('Registration not found', 404, { code: 'NOT_FOUND' });

  const reg = await Registration.findOneAndUpdate(
    { _id: registrationId, eventId: event._id, checkedInAt: { $ne: null } },
    { $set: { checkedInAt: null, checkedInBy: null } }
  );
  if (!reg) return jsonError('That attendee is not checked in', 404, { code: 'NOT_CHECKED_IN' });
  return jsonOk({ ok: true, stats: await checkInStats(event._id) });
}
