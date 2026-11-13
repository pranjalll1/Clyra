import { config } from '../config.js';

// Verifies a Cloudflare Turnstile token. In development with no secret set, the check is skipped.
// In production with no secret set, it fails closed.
export async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return !config.isProd;
  if (!token || typeof token !== 'string') return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// Express middleware: the request body must carry a valid `turnstileToken`.
export async function requireHuman(req, res, next) {
  if (await verifyTurnstile(req.body?.turnstileToken, req.ip)) return next();
  res.status(400).json({ error: 'Verification failed. Please try again.', code: 'CAPTCHA_FAILED' });
}
