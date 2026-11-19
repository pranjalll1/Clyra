export const dynamic = 'force-dynamic';
import { listAdminReviewEvents } from '@/modules/event-management/services/adminService.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withRole('admin', async (req) => {
    const url = new URL(req.url);
    return listAdminReviewEvents(url.searchParams);
  })
);
