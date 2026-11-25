// Unit III: Dynamic Route Handlers - /api/v1/events/[id]
// Handles GET (fetch draft/event by id) and PATCH (update draft event) with role authorization
export const dynamic = 'force-dynamic';
import { getManagedEvent, updateDraftEvent } from '@/modules/event-management/services/eventService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute, parseJson } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withRole(['organizer', 'admin'], async (_req, { params, user }) => {
    return getManagedEvent(params.id, user);
  })
);

export const PATCH = handleApiRoute(
  withRole(['organizer', 'admin'], async (req, { params, user }) => {
    const body = await parseJson(req);
    return updateDraftEvent(params.id, user, body);
  })
);
