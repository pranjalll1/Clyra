import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { config } from '../config.js';
import { sendMail } from './sendMail.js';

// Create in-app notifications (and optionally an email) for one user id or a list of ids.
//   await notify(event.createdBy, { type: 'event_approved', title: 'Your event was approved', body: event.title, link: `/organizer/events/${event._id}`, email: true });
// Never throws: a failed notification must not break the request that triggered it.
export async function notify(userIds, { type, title, body = '', link = '', email = false }) {
  try {
    const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(String))];
    if (!ids.length) return;
    await Notification.insertMany(ids.map((userId) => ({ userId, type, title, body, link })));

    if (email) {
      const users = await User.find({ _id: { $in: ids } }).select('name email');
      await Promise.allSettled(
        users.map((u) =>
          sendMail({
            to: u.email,
            subject: title,
            text: `Hi ${u.name},\n\n${title}${body ? `\n${body}` : ''}${link ? `\n\nOpen: ${config.clientUrl}${link}` : ''}\n\nClyra`,
          })
        )
      );
    }
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}
