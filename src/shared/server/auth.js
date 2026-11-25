// Unit IV: Authentication and Authorization
// Session Management, JWT verification, and Role-Based Access Control (RBAC)
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import User from '../models/User.js';
import { jsonError } from './response.js';

export const COOKIE = 'clyra_token';

// HTTP-only cookie configuration for secure session handling
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  maxAge: 7 * 24 * 60 * 60, // 7 days session duration
  path: '/',
};

// Generates signed JWT session token
export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, config.jwtSecret, { expiresIn: '7d' });
}

// Extracts session token from request cookies or authorization header
export function getTokenFromRequest(req) {
  if (req.cookies && typeof req.cookies.get === 'function') {
    const c = req.cookies.get(COOKIE);
    if (c?.value) return c.value;
    if (typeof c === 'string') return c;
  }
  const cookieHeader = req.headers.get?.('cookie') || req.headers?.cookie || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Validates token and fetches current authenticated user from MongoDB
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

// Higher-order route wrapper to protect endpoints (Authentication Guard)
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

// Role-Based Access Control wrapper (RBAC Guard: 'student' | 'organizer' | 'admin')
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
