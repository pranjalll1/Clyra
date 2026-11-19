export const dynamic = 'force-dynamic';
import { clearAuthCookie } from '@/shared/server/auth.js';
import { jsonOk } from '@/shared/server/response.js';

export async function POST() {
  const res = jsonOk({ message: 'Signed out' });
  return clearAuthCookie(res);
}
