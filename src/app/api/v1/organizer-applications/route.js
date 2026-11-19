export const dynamic = 'force-dynamic';
import {
  submitOrganizerApplication,
  listOrganizerApplications,
} from '@/modules/event-management/services/applicationService.js';
import { withAuth, withRole } from '@/shared/server/auth.js';
import { handleApiRoute, parseJson } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withAuth(async (req, { user }) => {
    const body = await parseJson(req);
    return submitOrganizerApplication(user, body);
  })
);

export const GET = handleApiRoute(
  withRole('admin', async (req) => {
    const url = new URL(req.url);
    return listOrganizerApplications(url.searchParams);
  })
);
