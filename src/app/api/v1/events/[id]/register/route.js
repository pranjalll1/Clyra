export const dynamic = 'force-dynamic';
import { registerForEvent, cancelRegistration } from '@/modules/student-discovery/handlers/registration.js';
import { withRole } from '@/shared/server/auth.js';
import { handleApiRoute } from '@/shared/server/response.js';

export const POST = handleApiRoute(
  withRole('student', async (_req, { params, user }) => {
    return registerForEvent(params.id, user);
  })
);

export const DELETE = handleApiRoute(
  withRole('student', async (_req, { params, user }) => {
    return cancelRegistration(params.id, user);
  })
);
