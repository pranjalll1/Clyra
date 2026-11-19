export const dynamic = 'force-dynamic';
import { listPublicEvents } from '@/modules/student-discovery/handlers/discovery.js';
import { createDraftEvent } from '@/modules/event-management/services/eventService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute, parseJson } from '@/shared/server/response.js';

export const GET = handleApiRoute(async (req) => {
  const url = new URL(req.url);
  return listPublicEvents(url.searchParams);
});

export const POST = handleApiRoute(
  withRole(['organizer', 'admin'], async (req, { user }) => {
    const body = await parseJson(req);
    return createDraftEvent(user, body);
  })
);
