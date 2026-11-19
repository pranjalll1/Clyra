export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '@/shared/models/User.js';
import { strongPassword } from '@/shared/lib/password.js';
import { handleApiRoute, jsonError, jsonOk, parseJson } from '@/shared/server/response.js';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const fieldErrors = (err) => err.flatten().fieldErrors;

export const POST = handleApiRoute(async (req) => {
  const body = await parseJson(req);
  const parsed = z.object({ token: z.string().min(10), password: strongPassword }).safeParse(body);
  if (!parsed.success) {
    return jsonError('Check the highlighted fields', 400, { fields: fieldErrors(parsed.error) });
  }

  const user = await User.findOne({
    resetTokenHash: sha256(parsed.data.token),
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires');

  if (!user) {
    return jsonError('This reset link is invalid or has expired', 400, { code: 'INVALID_TOKEN' });
  }

  user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  user.passwordChangedAt = new Date();
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  if (!user.emailVerifiedAt) user.emailVerifiedAt = new Date();
  await user.save();

  return jsonOk({ message: 'Password updated. You can sign in with the new password.' });
});
