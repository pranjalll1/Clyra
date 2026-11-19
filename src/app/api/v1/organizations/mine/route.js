export const dynamic = 'force-dynamic';
import { getMyOrganizations } from '@/modules/event-management/services/eventService.js';
import { withAuth } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withAuth(async (_req, { user }) => {
    return getMyOrganizations(user);
  })
);
