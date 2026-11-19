export const dynamic = 'force-dynamic';
import { clashCheckVenue } from '@/modules/venue-clash/handlers/venues.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const GET = handleApiRoute(
  withRole(['organizer', 'admin'], async (req, { params }) => {
    const url = new URL(req.url);
    return clashCheckVenue(params.id, url.searchParams);
  })
);
