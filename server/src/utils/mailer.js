import { sendMail } from './sendMail.js';

// Kept so existing imports keep working. Sending goes through the shared sendMail helper.
export async function sendVerificationEmail(to, name, link) {
  await sendMail({
    to,
    subject: 'Verify your Clyra account',
    text: `Hi ${name},\n\nConfirm your email to activate your account:\n${link}\n\nThis link expires in 24 hours.`,
  });
}
