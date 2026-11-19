import nodemailer from 'nodemailer';
import { config } from './config.js';

// Order of preference:
// 1. Brevo HTTP API (BREVO_API_KEY): works on hosts that block SMTP ports, such as Render's free tier.
// 2. SMTP (SMTP_HOST): fine for local development.
// 3. Console: the message is printed in the server log.
const smtp = config.mail.host
  ? nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    })
  : null;

// Never throws: a failed email must not break the request that triggered it. Returns true when sent.
export async function sendMail({ to, subject, text }) {
  try {
    if (process.env.BREVO_API_KEY) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: process.env.MAIL_SENDER_NAME || 'Clyra', email: process.env.MAIL_SENDER_EMAIL },
          to: [{ email: to }],
          subject,
          textContent: text,
        }),
      });
      if (!res.ok) throw new Error(`Brevo responded ${res.status}: ${await res.text()}`);
      return true;
    }
    if (smtp) {
      await smtp.sendMail({ from: config.mail.from, to, subject, text });
      return true;
    }
    console.log(`\n[mail] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return true;
  } catch (err) {
    console.error('[mail] failed:', err.message);
    return false;
  }
}
