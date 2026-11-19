export const dynamic = 'force-dynamic';
import { getAttendeeRoster } from '@/modules/event-management/services/gateService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withRole(['organizer', 'admin'], async (req, { params, user }) => {
    const url = new URL(req.url);
    return getAttendeeRoster(params.id, user, url.searchParams);
  })
);
