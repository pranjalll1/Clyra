import Event from '@/shared/models/Event.js';
import Registration from '@/shared/models/Registration.js';
import { registrationState, toCardDto } from '@/shared/lib/eventRules.js';
import { notify } from '@/shared/server/notify.js';
import { jsonError, jsonOk } from '@/shared/server/response.js';

const isId = (s) => /^[a-f\d]{24}$/i.test(String(s || ''));
const NOT_OPEN = {
  ended: 'This event has already ended',
  paused: 'Registration is paused for this event',
  not_open_yet: 'Registration has not opened yet',
  closed: 'Registration is closed for this event',
};

export async function registerForEvent(eventId, user) {
  const userId = user._id;
  let seatTaken = false;
  const releaseSeat = () =>
    Event.updateOne({ _id: eventId, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });

  try {
    if (!isId(eventId)) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });
    const event = await Event.findOne({ _id: eventId, status: 'published', archivedAt: null });
    if (!event) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });

    const state = registrationState(event);
    if (state !== 'open') return jsonError(NOT_OPEN[state], 409, { code: `REG_${state.toUpperCase()}` });

    if (await Registration.exists({ eventId, userId, status: 'registered' })) {
      return jsonError('You are already registered for this event', 409, { code: 'ALREADY_REGISTERED' });
    }

    // 1) Reserve a seat atomically: succeeds only if there is still room (or capacity is unlimited).
    const reserved = await Event.findOneAndUpdate(
      { _id: eventId, $or: [{ capacity: null }, { $expr: { $lt: [{ $ifNull: ['$registeredCount', 0] }, '$capacity'] } }] },
      { $inc: { registeredCount: 1 } },
      { new: true }
    );
    if (!reserved) return jsonError('This event is full', 409, { code: 'FULL' });
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
          return jsonError('You are already registered for this event', 409, { code: 'ALREADY_REGISTERED' });
        }
        throw err;
      }
    }

    seatTaken = false;
    notify(userId, { type: 'registration', title: 'You are registered', body: event.title, link: '/my-bookings', email: true });

    return jsonOk(
      {
        registration: { id: reg._id.toString(), status: reg.status, registeredAt: reg.createdAt },
        seatsLeft: reserved.capacity == null ? null : Math.max(0, reserved.capacity - reserved.registeredCount),
      },
      201
    );
  } catch (err) {
    if (seatTaken) await releaseSeat().catch(() => {});
    throw err;
  }
}

export async function cancelRegistration(eventId, user) {
  if (!isId(eventId)) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });
  const event = await Event.findById(eventId).select('startAt title');
  if (!event) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });
  if (event.startAt && event.startAt <= new Date()) {
    return jsonError('You cannot cancel once the event has started', 409, { code: 'TOO_LATE' });
  }

  const reg = await Registration.findOneAndUpdate(
    { eventId, userId: user._id, status: 'registered' },
    { $set: { status: 'cancelled', cancelledAt: new Date() } }
  );
  if (!reg) return jsonError('You are not registered for this event', 404, { code: 'NOT_REGISTERED' });

  await Event.updateOne({ _id: eventId, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });
  return jsonOk({ ok: true });
}

export async function getMyRegistrations(user, searchParams) {
  const tab = searchParams.get('tab') === 'past' ? 'past' : 'upcoming';
  const now = new Date();

  const regs = await Registration.find({ userId: user._id, status: 'registered' }).populate({
    path: 'eventId',
    populate: [
      { path: 'categoryId', select: 'name slug' },
      { path: 'venueId', select: 'name' },
      { path: 'organizationId', select: 'name' },
    ],
  });

  const rows = regs
    .filter((r) => r.eventId)
    .map((r) => ({
      registrationId: r._id.toString(),
      ticketCode: r.ticketCode,
      registeredAt: r.createdAt,
      event: { ...toCardDto(r.eventId), status: r.eventId.status },
    }));

  const isPast = (row) => row.event.endAt && new Date(row.event.endAt) < now;
  const upcoming = rows.filter((x) => !isPast(x)).sort((a, b) => new Date(a.event.startAt) - new Date(b.event.startAt));
  const past = rows.filter(isPast).sort((a, b) => new Date(b.event.startAt) - new Date(a.event.startAt));

  return jsonOk({
    items: tab === 'past' ? past : upcoming,
    counts: { upcoming: upcoming.length, past: past.length },
  });
}
