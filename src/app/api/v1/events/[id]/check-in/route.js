export const dynamic = 'force-dynamic';
import { checkInAttendee } from '@/modules/event-management/services/gateService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute, parseJson } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withRole(['organizer', 'admin'], async (req, { params, user }) => {
    const body = await parseJson(req);
    return checkInAttendee(params.id, user, body);
  })
);
