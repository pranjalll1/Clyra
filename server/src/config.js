import 'dotenv/config';

const required = (name) => {
  if (!process.env[name]) throw new Error(`Missing required env var: ${name}`);
  return process.env[name];
};

export const config = {
  port: Number(process.env.PORT) || 5000,
  isProd: process.env.NODE_ENV === 'production',
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
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
