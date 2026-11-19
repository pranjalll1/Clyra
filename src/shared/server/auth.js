import jwt from 'jsonwebtoken';
import { config } from './config.js';
import User from '../models/User.js';
import { jsonError } from './response.js';

export const COOKIE = 'clyra_token';

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds for Next.js cookies
  path: '/',
};

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, config.jwtSecret, { expiresIn: '7d' });
}

export function getTokenFromRequest(req) {
  // Try NextRequest cookies
  if (req.cookies && typeof req.cookies.get === 'function') {
    const c = req.cookies.get(COOKIE);
    if (c?.value) return c.value;
    if (typeof c === 'string') return c;
  }
  // Fallback to cookie header string
  const cookieHeader = req.headers.get?.('cookie') || req.headers?.cookie || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getAuthUser(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    const { sub, iat } = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(sub);
    if (!user) return null;

    if (user.passwordChangedAt && iat * 1000 < user.passwordChangedAt.getTime()) {
      return null;
    }

    if (!user.emailVerifiedAt) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function withAuth(handler) {
  return async function (req, context) {
    const token = getTokenFromRequest(req);
    if (!token) {
      return jsonError('Sign in required', 401, { code: 'UNAUTHENTICATED' });
    }
    const user = await getAuthUser(req);
    if (!user) {
      return jsonError('Sign in required', 401, { code: 'UNAUTHENTICATED' });
    }
    return handler(req, { ...context, user });
  };
}

export function withRole(roles, handler) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return withAuth(async function (req, context) {
    if (!allowed.includes(context.user?.role)) {
      return jsonError('You do not have access to this action', 403, { code: 'FORBIDDEN' });
    }
    return handler(req, context);
  });
}

export async function optionalAuth(req) {
  return await getAuthUser(req);
}

export function setAuthCookie(response, token) {
  response.cookies.set(COOKIE, token, cookieOptions);
  return response;
}

export function clearAuthCookie(response) {
  response.cookies.delete({ name: COOKIE, path: '/' });
  return response;
}
