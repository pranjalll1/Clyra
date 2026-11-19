export const dynamic = 'force-dynamic';
import { listOrganizerEvents } from '@/modules/event-management/services/eventService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withRole(['organizer', 'admin'], async (req, { user }) => {
    const url = new URL(req.url);
    return listOrganizerEvents(user, url.searchParams);
  })
);
