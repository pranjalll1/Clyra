import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import User from '../models/User.js';
import { config } from '../config.js';
import { sendVerificationEmail } from '../utils/mailer.js';
import { sendMail } from '../utils/sendMail.js';
import { strongPassword } from '../utils/password.js';
import { COOKIE, cookieOptions, signToken } from '../middleware/auth.js';

const router = Router();

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const emailSchema = z.string().trim().toLowerCase().email();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: strongPassword,
  accountType: z.enum(['student', 'organizer']).default('student'),
});

const fieldErrors = (err) => err.flatten().fieldErrors;
const domainAllowed = (email) => config.allowedDomains.includes(email.split('@')[1]);

async function issueVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.verifyTokenHash = sha256(token);
  user.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  const link = `${config.clientUrl}/verify-email?token=${token}`;
  await sendVerificationEmail(user.email, user.name, link);
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Check the highlighted fields', fields: fieldErrors(parsed.error) });
    const { name, email, password, accountType } = parsed.data;

    if (!domainAllowed(email)) {
      return res.status(400).json({
        error: `Use your college email (${config.allowedDomains.map((d) => '@' + d).join(', ')})`,
        fields: { email: ['Email domain is not allowed'] },
      });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_TAKEN' });
    }

    // Everyone starts as a student. Choosing "organizer" only records the wish: the role changes when an admin approves the request.
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), requestedRole: accountType });
    await issueVerification(user);
    res.status(201).json({
      message: accountType === 'organizer'
        ? 'Account created. Verify your email, sign in, then submit your organizer details for admin approval.'
        : 'Account created. Check your college inbox for the verification link.',
    });
  } catch (err) { next(err); }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const token = z.string().min(10).safeParse(req.body?.token);
    if (!token.success) return res.status(400).json({ error: 'Verification link is invalid', code: 'INVALID_TOKEN' });
    const user = await User.findOne({
      verifyTokenHash: sha256(token.data),
      verifyTokenExpires: { $gt: new Date() },
    }).select('+verifyTokenHash +verifyTokenExpires');
    if (!user) return res.status(400).json({ error: 'Verification link is invalid or expired', code: 'INVALID_TOKEN' });

    user.emailVerifiedAt = new Date();
    user.verifyTokenHash = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();
    res.json({ message: 'Email verified. You can sign in now.' });
  } catch (err) { next(err); }
});

// Always answers 200 so the endpoint cannot be used to discover which emails have accounts.
router.post('/resend-verification', async (req, res, next) => {
  try {
    const email = emailSchema.safeParse(req.body?.email);
    if (email.success) {
      const user = await User.findOne({ email: email.data });
      if (user && !user.emailVerifiedAt) await issueVerification(user);
    }
    res.json({ message: 'If that account needs verification, a new link has been sent.' });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = z.object({ email: emailSchema, password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Enter your email and password' });

    const user = await User.findOne({ email: parsed.data.email }).select('+passwordHash');
    const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Email or password is incorrect', code: 'BAD_CREDENTIALS' });
    if (!user.emailVerifiedAt) {
      return res.status(403).json({ error: 'Verify your email before signing in', code: 'EMAIL_NOT_VERIFIED' });
    }

    res.cookie(COOKIE, signToken(user), cookieOptions);
    res.json({ user: user.toPublic() });
  } catch (err) { next(err); }
});

// Always answers 200 (same text whether or not the account exists). The link expires in 1 hour.
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = emailSchema.safeParse(req.body?.email);
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
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const parsed = z.object({ token: z.string().min(10), password: strongPassword }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Check the highlighted fields', fields: fieldErrors(parsed.error) });

    const user = await User.findOne({
      resetTokenHash: sha256(parsed.data.token),
      resetTokenExpires: { $gt: new Date() },
    }).select('+resetTokenHash +resetTokenExpires');
    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired', code: 'INVALID_TOKEN' });

    user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    user.passwordChangedAt = new Date();
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    if (!user.emailVerifiedAt) user.emailVerifiedAt = new Date(); // they proved they control the inbox
    await user.save();
    res.json({ message: 'Password updated. You can sign in with the new password.' });
  } catch (err) { next(err); }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'Signed out' });
});

export default router;
