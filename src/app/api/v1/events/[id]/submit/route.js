export const dynamic = 'force-dynamic';
import { submitEventForReview } from '@/modules/event-management/services/eventService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withRole(['organizer', 'admin'], async (_req, { params, user }) => {
    return submitEventForReview(params.id, user);
  })
);
