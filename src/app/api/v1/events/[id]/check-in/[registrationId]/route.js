export const dynamic = 'force-dynamic';
import { undoCheckIn } from '@/modules/event-management/services/gateService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const DELETE = handleApiRoute(
  withRole(['organizer', 'admin'], async (_req, { params, user }) => {
    return undoCheckIn(params.id, params.registrationId, user);
  })
);
