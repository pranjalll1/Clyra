export const dynamic = 'force-dynamic';
import { approveEvent } from '@/modules/event-management/services/adminService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute, parseJson } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withRole('admin', async (req, { params, user }) => {
    const body = await parseJson(req);
    return approveEvent(params.id, user, body);
  })
);
