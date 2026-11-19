export const dynamic = 'force-dynamic';
import { getMyApplication } from '@/modules/event-management/services/applicationService.js';
import { withAuth } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withAuth(async (_req, { user }) => {
    return getMyApplication(user);
  })
);
