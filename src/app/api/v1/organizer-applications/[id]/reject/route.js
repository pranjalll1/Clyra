export const dynamic = 'force-dynamic';
import { rejectOrganizerApplication } from '@/modules/event-management/services/applicationService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute, parseJson } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withRole('admin', async (req, { params, user }) => {
    const body = await parseJson(req);
    return rejectOrganizerApplication(params.id, user, body);
  })
);
