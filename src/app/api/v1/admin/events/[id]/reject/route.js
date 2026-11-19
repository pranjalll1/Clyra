export const dynamic = 'force-dynamic';
import { rejectEvent } from '@/modules/event-management/services/adminService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute, parseJson } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withRole('admin', async (req, { params, user }) => {
    const body = await parseJson(req);
    return rejectEvent(params.id, user, body);
  })
);
