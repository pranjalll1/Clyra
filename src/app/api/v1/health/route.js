export const dynamic = 'force-dynamic';
import { jsonOk } from '@/shared/server/response.js';

export async function GET() {
  return jsonOk({ ok: true });
}
