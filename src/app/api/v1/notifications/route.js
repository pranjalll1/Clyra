export const dynamic = 'force-dynamic';
import { z } from 'zod';
import Notification from '@/shared/models/Notification.js';
import { withAuth } from '@/shared/server/auth.js';
import { handleApiRoute, jsonError, jsonOk } from '@/shared/server/response.js';

const dto = (n) => ({
  id: n._id.toString(),
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  read: !!n.readAt,
  createdAt: n.createdAt,
});

export const GET = handleApiRoute(
  withAuth(async (req, { user }) => {
    const url = new URL(req.url);
    const q = z
      .object({
        limit: z.coerce.number().int().min(1).max(50).default(20),
        before: z.coerce.date().optional(),
      })
      .safeParse(Object.fromEntries(url.searchParams));

    if (!q.success) return jsonError('Invalid query', 400);

    const filter = { userId: user._id };
    if (q.data.before) filter.createdAt = { $lt: q.data.before };

    const rows = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(q.data.limit + 1);
    const unread = await Notification.countDocuments({ userId: user._id, readAt: null });

    return jsonOk({
      items: rows.slice(0, q.data.limit).map(dto),
      hasMore: rows.length > q.data.limit,
      unread,
    });
  })
);
