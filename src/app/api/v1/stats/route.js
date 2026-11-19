export const dynamic = 'force-dynamic';
import { getLandingStats } from '@/modules/student-discovery/handlers/discovery.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(async () => {
  return getLandingStats();
});
