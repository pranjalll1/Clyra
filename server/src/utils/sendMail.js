import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transport = config.mail.host
  ? nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    })
  : null;

// Generic sender. With no SMTP settings the message is printed in the server console instead.
export async function sendMail({ to, subject, text }) {
  if (!transport) {
    console.log(`\n[mail] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await transport.sendMail({ from: config.mail.from, to, subject, text });
}
