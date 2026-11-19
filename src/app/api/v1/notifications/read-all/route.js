export const dynamic = 'force-dynamic';
import Notification from '@/shared/models/Notification.js';
import { withAuth } from '@/shared/server/auth.js';
import { handleApiRoute, jsonOk } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withAuth(async (_req, { user }) => {
    await Notification.updateMany({ userId: user._id, readAt: null }, { $set: { readAt: new Date() } });
    return jsonOk({ unread: 0 });
  })
);
