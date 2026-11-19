export const dynamic = 'force-dynamic';
import { listVenues } from '@/modules/venue-clash/handlers/venues.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(async () => {
  return listVenues();
});
