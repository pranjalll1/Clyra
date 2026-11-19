export const dynamic = 'force-dynamic';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '@/shared/models/User.js';
import { signToken, setAuthCookie } from '@/shared/server/auth.js';
import { handleApiRoute, jsonError, jsonOk, parseJson } from '@/shared/server/response.js';

const emailSchema = z.string().trim().toLowerCase().email();

export const POST = handleApiRoute(async (req) => {
  const body = await parseJson(req);
  const parsed = z.object({ email: emailSchema, password: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return jsonError('Enter your email and password', 400);
  }

  const user = await User.findOne({ email: parsed.data.email }).select('+passwordHash');
  const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!ok) {
    return jsonError('Email or password is incorrect', 401, { code: 'BAD_CREDENTIALS' });
  }

  const token = signToken(user);
  const response = jsonOk({ user: user.toPublic() });
  return setAuthCookie(response, token);
});
