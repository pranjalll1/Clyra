export const dynamic = 'force-dynamic';
import { getMyRegistrations } from '@/modules/student-discovery/handlers/registration.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withRole('student', async (req, { user }) => {
    const url = new URL(req.url);
    return getMyRegistrations(user, url.searchParams);
  })
);
