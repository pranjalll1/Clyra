export const dynamic = 'force-dynamic';
import Notification from '@/shared/models/Notification.js';
import { withAuth } from '@/shared/server/auth.js';
import { handleApiRoute, jsonOk } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withAuth(async (_req, { user }) => {
    const unread = await Notification.countDocuments({ userId: user._id, readAt: null });
    return jsonOk({ unread });
  })
);
