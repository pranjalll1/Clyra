export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { z } from 'zod';
import User from '@/shared/models/User.js';
import { config } from '@/shared/server/config.js';
import { sendMail } from '@/shared/server/sendMail.js';
import { handleApiRoute, jsonOk, parseJson } from '@/shared/server/response.js';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const emailSchema = z.string().trim().toLowerCase().email();

export const POST = handleApiRoute(async (req) => {
  const body = await parseJson(req);
  const email = emailSchema.safeParse(body?.email);
  if (email.success) {
    const user = await User.findOne({ email: email.data });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash = sha256(token);
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      await sendMail({
        to: user.email,
        subject: 'Reset your Clyra password',
        text: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in 1 hour:\n${config.clientUrl}/reset-password?token=${token}\n\nIf you did not ask for this, ignore this email. Your password stays the same.`,
      });
    }
  }
  return jsonOk({ message: 'If an account exists for that email, a reset link has been sent.' });
});
