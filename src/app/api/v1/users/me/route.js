export const dynamic = 'force-dynamic';
import { withAuth } from '@/shared/server/auth.js';
import { handleApiRoute, jsonOk } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withAuth(async (_req, { user }) => {
    return jsonOk({ user: user.toPublic() });
  })
);
