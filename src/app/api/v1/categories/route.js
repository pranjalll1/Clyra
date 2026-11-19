export const dynamic = 'force-dynamic';
import Category from '@/shared/models/Category.js';
import { handleApiRoute, jsonOk } from '@/shared/server/response.js';

export const GET = handleApiRoute(async () => {
  const items = await Category.find().sort('order').lean();
  return jsonOk({ items });
});
