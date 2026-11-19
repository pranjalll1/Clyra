export const dynamic = 'force-dynamic';
import Notification from '@/shared/models/Notification.js';
import { withAuth } from '@/shared/server/auth.js';
import { handleApiRoute, jsonError, jsonOk } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withAuth(async (_req, { params, user }) => {
    const id = params?.id;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return jsonError('Not found', 404);
    }

    await Notification.updateOne({ _id: id, userId: user._id, readAt: null }, { $set: { readAt: new Date() } });
    return jsonOk({ ok: true });
  })
);
