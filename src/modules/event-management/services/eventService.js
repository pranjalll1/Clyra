import Event, { nextShortCode } from '@/shared/models/Event.js';
import Organization from '@/shared/models/Organization.js';
import Venue from '@/shared/models/Venue.js';
import User from '@/shared/models/User.js';
import {
  createSchema,
  patchSchema,
  fieldErrors,
  crossChecks,
  completeness,
  toDto,
} from '@/shared/lib/eventRules.js';
// Module 1 calls the clash check through Module 3's exported function
import { checkVenueClash, conflictDto } from '@/modules/venue-clash/index.js';
import { notify } from '@/shared/server/notify.js';
import { jsonError, jsonOk } from '@/shared/server/response.js';

const EDITABLE = ['draft', 'rejected'];

export const orgIdsFor = (user) => Organization.find({ 'members.user': user._id }).distinct('_id');

export async function canManage(user, event) {
  if (user.role === 'admin') return true;
  if (event.createdBy.equals(user._id) || event.coOrganizers.some((id) => id.equals(user._id))) return true;
  return (await orgIdsFor(user)).some((id) => id.equals(event.organizationId));
}

export async function loadManaged(id, user) {
  const event = /^[a-f\d]{24}$/i.test(id) ? await Event.findById(id) : null;
  if (!event || !(await canManage(user, event))) {
    return null;
  }
  return event;
}

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

export async function createDraftEvent(user, body) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Check the highlighted fields', 400, { fields: fieldErrors(parsed.error) });
  }
  const data = parsed.data;

  const isMember = user.role === 'admin' || (await orgIdsFor(user)).some((id) => id.equals(data.organizationId));
  if (!isMember) {
    return jsonError('You are not a member of that organization', 403, { code: 'FORBIDDEN' });
  }

  const venue = data.venueId ? await Venue.findById(data.venueId) : null;
  const fields = crossChecks(data, venue);
  if (Object.keys(fields).length) {
    return jsonError('Check the highlighted fields', 400, { fields });
  }

  const shortCode = await nextShortCode();
  const event = await Event.create({
    ...data,
    createdBy: user._id,
    shortCode,
    slug: `${slugify(data.title) || 'event'}-${shortCode.toLowerCase()}`,
  });

  return jsonOk({ event: toDto(event), completeness: completeness(event) }, 201);
}

export async function getManagedEvent(id, user) {
  const event = await loadManaged(id, user);
  if (!event) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });
  return jsonOk({ event: toDto(event), completeness: completeness(event) });
}

export async function updateDraftEvent(id, user, body) {
  const event = await loadManaged(id, user);
  if (!event) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });

  if (!EDITABLE.includes(event.status)) {
    return jsonError('Only drafts and rejected events can be edited', 409, { code: 'NOT_EDITABLE' });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Check the highlighted fields', 400, { fields: fieldErrors(parsed.error) });
  }

  const merged = { ...event.toObject(), ...parsed.data };
  const venue = merged.venueId ? await Venue.findById(merged.venueId) : null;
  const fields = crossChecks(merged, venue);
  if (Object.keys(fields).length) {
    return jsonError('Check the highlighted fields', 400, { fields });
  }

  event.set(parsed.data);
  await event.save();
  return jsonOk({ event: toDto(event), completeness: completeness(event) });
}

export async function submitEventForReview(id, user) {
  const event = await loadManaged(id, user);
  if (!event) return jsonError('Event not found', 404, { code: 'NOT_FOUND' });

  if (!EDITABLE.includes(event.status)) {
    return jsonError('This event is already submitted or published', 409, { code: 'NOT_EDITABLE' });
  }

  const progress = completeness(event);
  if (progress.missing.length) {
    return jsonError(`Finish these first: ${progress.missing.join(', ')}`, 400, {
      code: 'INCOMPLETE',
      missing: progress.missing,
    });
  }

  const venue = await Venue.findById(event.venueId);
  const fields = crossChecks(event.toObject(), venue);
  if (event.startAt <= new Date()) fields.startAt = ['The start must be in the future'];
  if (Object.keys(fields).length) {
    return jsonError('Check the highlighted fields', 400, { fields });
  }

  // Module 3: clash check
  const clash = await checkVenueClash({
    venueId: event.venueId,
    startAt: event.startAt,
    endAt: event.endAt,
    excludeId: event._id,
  });
  if (clash.clash) {
    return jsonError(`${clash.venueName} is already booked at that time. Change the venue or the time.`, 409, {
      code: 'VENUE_CLASH',
      conflicts: clash.overlaps.map(conflictDto),
    });
  }

  const nextStatus = user.role === 'admin' ? 'published' : 'pending_approval';
  const updated = await Event.findOneAndUpdate(
    { _id: event._id, status: { $in: EDITABLE } },
    { $set: { status: nextStatus, submittedAt: new Date() } },
    { new: true }
  );
  if (!updated) {
    return jsonError('This event was already submitted', 409, { code: 'NOT_EDITABLE' });
  }

  if (nextStatus === 'pending_approval') {
    notify(await User.find({ role: 'admin' }).distinct('_id'), {
      type: 'event_submitted',
      title: 'New event to review',
      body: updated.title,
      link: '/admin/review',
    });
  }

  return jsonOk({ event: toDto(updated), completeness: completeness(updated) });
}

export async function listOrganizerEvents(user, searchParams) {
  const orgIds = await orgIdsFor(user);
  const scope =
    user.role === 'admin'
      ? { archivedAt: null }
      : { archivedAt: null, $or: [{ organizationId: { $in: orgIds } }, { createdBy: user._id }] };

  const filter = { ...scope };
  const statusParam = searchParams.get('status');
  if (statusParam && statusParam !== 'all') filter.status = String(statusParam);
  const q = String(searchParams.get('q') || '').trim().slice(0, 80);
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$and = [{ $or: [{ title: rx }, { shortCode: rx }] }];
  }
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 10));

  const [items, total, grouped] = await Promise.all([
    Event.find(filter)
      .sort('-updatedAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('venueId', 'name')
      .populate('categoryId', 'name'),
    Event.countDocuments(filter),
    Event.aggregate([{ $match: scope }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);

  const counts = { all: 0 };
  for (const g of grouped) {
    counts[g._id] = g.n;
    counts.all += g.n;
  }

  return jsonOk({ items: items.map(toDto), total, page, limit, counts });
}

export async function getMyOrganizations(user) {
  const filter = user.role === 'admin' ? {} : { 'members.user': user._id };
  const orgs = await Organization.find(filter).sort('name').lean();
  return jsonOk({ items: orgs.map((o) => ({ id: o._id.toString(), name: o.name, verified: o.verified })) });
}
