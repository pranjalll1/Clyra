import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';

export const COOKIE = 'clyra_token';

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, config.jwtSecret, { expiresIn: '7d' });
}

// Loads the user fresh from the DB so role changes take effect immediately.
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: 'Sign in required', code: 'UNAUTHENTICATED' });
    const { sub } = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(sub);
    if (!user || !user.emailVerifiedAt) {
      return res.status(401).json({ error: 'Sign in required', code: 'UNAUTHENTICATED' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sign in required', code: 'UNAUTHENTICATED' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'You do not have access to this action', code: 'FORBIDDEN' });
    // Like requireAuth, but never blocks. Sets req.user when a valid cookie is present and carries on either way.
export async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE];
    if (token) {
      const { sub } = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(sub);
      if (user && user.emailVerifiedAt) req.user = user;
    }
  } catch { /* bad or expired token: treat as signed out */ }
  next();
}
