export const dynamic = 'force-dynamic';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '@/shared/models/User.js';
import { config } from '@/shared/server/config.js';
import { strongPassword } from '@/shared/lib/password.js';
import { signToken, setAuthCookie } from '@/shared/server/auth.js';
import { handleApiRoute, jsonError, jsonOk, parseJson } from '@/shared/server/response.js';

const emailSchema = z.string().trim().toLowerCase().email();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: strongPassword,
  accountType: z.enum(['student', 'organizer']).default('student'),
});

const fieldErrors = (err) => err.flatten().fieldErrors;
const domainAllowed = (email) => config.allowedDomains.includes(email.split('@')[1]);

export const POST = handleApiRoute(async (req) => {
  const body = await parseJson(req);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Check the highlighted fields', 400, { fields: fieldErrors(parsed.error) });
  }
  const { name, email, password, accountType } = parsed.data;

  if (!domainAllowed(email)) {
    return jsonError(`Use your college email (${config.allowedDomains.map((d) => '@' + d).join(', ')})`, 400, {
      fields: { email: ['Email domain is not allowed'] },
    });
  }

  if (await User.exists({ email })) {
    return jsonError('An account with this email already exists', 409, { code: 'EMAIL_TAKEN' });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    requestedRole: accountType,
    emailVerifiedAt: new Date(),
  });

  const token = signToken(user);
  const response = jsonOk({ user: user.toPublic() }, 201);
  return setAuthCookie(response, token);
});
