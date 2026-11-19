export const dynamic = 'force-dynamic';
import { getEventBySlug } from '@/modules/student-discovery/handlers/discovery.js';
import { optionalAuth } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(async (req, { params }) => {
  const user = await optionalAuth(req);
  return getEventBySlug(params.slug, user);
});
