// Unit III: Route Handlers - REST API endpoints for /api/v1/events
// Demonstrates HTTP Methods (GET for discovery, POST for draft creation) & RBAC (Unit IV)
export const dynamic = 'force-dynamic';
import { listPublicEvents } from '@/modules/student-discovery/handlers/discovery.js';
import { createDraftEvent } from '@/modules/event-management/services/eventService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute, parseJson } from '@/shared/server/response.js';

// GET /api/v1/events - Public event catalog with search, filtering, and facets
export const GET = handleApiRoute(async (req) => {
  const url = new URL(req.url);
  return listPublicEvents(url.searchParams);
});

// POST /api/v1/events - Protected route (organizers/admins only) to create a new draft
export const POST = handleApiRoute(
  withRole(['organizer', 'admin'], async (req, { user }) => {
    const body = await parseJson(req);
    return createDraftEvent(user, body);
  })
);
