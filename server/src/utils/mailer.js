import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transport = config.mail.host
  ? nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    })
  : null;

export async function sendVerificationEmail(to, name, link) {
  if (!transport) {
    // Dev fallback: no SMTP configured, print the link instead.
    console.log(`\n[mail] Verification link for ${to}:\n${link}\n`);
    return;
  }
  await transport.sendMail({
    from: config.mail.from,
    to,
    subject: 'Verify your Clyra account',
    text: `Hi ${name},\n\nConfirm your email to activate your account:\n${link}\n\nThis link expires in 24 hours.`,
  });
}
