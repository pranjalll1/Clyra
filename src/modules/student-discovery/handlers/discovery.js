import Event from '@/shared/models/Event.js';
import Organization from '@/shared/models/Organization.js';
import Venue from '@/shared/models/Venue.js';
import Registration from '@/shared/models/Registration.js';
import Category from '@/shared/models/Category.js';
import {
  listQuerySchema,
  whenRange,
  toCardDto,
  toDetailDto,
  fieldErrors,
} from '@/shared/lib/eventRules.js';
import { jsonError, jsonOk } from '@/shared/server/response.js';

export async function getLandingStats() {
  const [events, clubs, venues, registrations] = await Promise.all([
    Event.countDocuments({ status: 'published', archivedAt: null, endAt: { $gte: new Date() } }),
    Organization.countDocuments(),
    Venue.countDocuments({ isActive: true }),
    Registration.countDocuments({ status: 'registered' }),
  ]);
  return jsonOk({ events, clubs, venues, registrations });
}

export async function listPublicEvents(searchParams) {
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return jsonError('Check the filters', 400, { fields: fieldErrors(parsed.error) });
  }
  const { q, category, price, mode, venueType, when, sort, page, limit } = parsed.data;

  const { from, to } = whenRange(when);

  const base = { status: 'published', archivedAt: null, endAt: { $gte: from } };
  if (to) base.startAt = { $lte: to };
  if (price) base['price.isFree'] = price === 'free';
  if (mode) base.mode = mode;
  if (q) base.title = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (venueType) base.venueId = { $in: await Venue.find({ type: venueType }).distinct('_id') };

  const filter = { ...base };
  const slugs = category ? category.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10) : [];
  if (slugs.length) filter.categoryId = { $in: await Category.find({ slug: { $in: slugs } }).distinct('_id') };

  const order =
    sort === 'newest'
      ? { createdAt: -1, _id: -1 }
      : sort === 'popular'
      ? { registeredCount: -1, startAt: 1, _id: 1 }
      : { startAt: 1, _id: 1 };

  const [items, total, grouped, categories] = await Promise.all([
    Event.find(filter)
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('categoryId', 'name slug')
      .populate('venueId', 'name')
      .populate('organizationId', 'name'),
    Event.countDocuments(filter),
    Event.aggregate([{ $match: base }, { $group: { _id: '$categoryId', n: { $sum: 1 } } }]),
    Category.find().sort('order').lean(),
  ]);

  const counts = new Map(grouped.map((g) => [String(g._id), g.n]));
  return jsonOk({
    items: items.map(toCardDto),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    facets: { categories: categories.map((c) => ({ slug: c.slug, name: c.name, count: counts.get(String(c._id)) || 0 })) },
  });
}

export async function getEventBySlug(slug, user = null) {
  const notFound = () => jsonError('Event not found', 404, { code: 'NOT_FOUND' });
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return notFound();

  const event = await Event.findOne({ slug, status: 'published', archivedAt: null })
    .populate('categoryId', 'name slug')
    .populate('venueId', 'name type capacity')
    .populate('organizationId', 'name');
  if (!event) return notFound();

  const dto = toDetailDto(event);
  dto.myRegistration = null;
  if (user) {
    const reg = await Registration.findOne({ eventId: event._id, userId: user._id, status: 'registered' });
    if (reg) dto.myRegistration = { id: reg._id.toString(), status: reg.status, registeredAt: reg.createdAt };
  }
  return jsonOk({ event: dto });
}
