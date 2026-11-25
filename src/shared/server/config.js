// Unit IV: Database Integration - Environment Variables & Application Configuration
import dotenv from 'dotenv';

// Load .env.local first (Next.js App Router standard), fallback to .env for node scripts
dotenv.config({ path: '.env.local' });
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProd: process.env.NODE_ENV === 'production',
  get mongoUri() {
    return process.env.MONGODB_URI || '';
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || 'clyra-local-development-secret-key-32chars';
  },
  clientUrl: process.env.CLIENT_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  allowedDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'lpu.in')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
  mail: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'Clyra <no-reply@clyra.local>',
  },
};
