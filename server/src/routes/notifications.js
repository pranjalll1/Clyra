import { Router } from 'express';
import { z } from 'zod';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const dto = (n) => ({
  id: n._id.toString(),
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  read: !!n.readAt,
  createdAt: n.createdAt,
});

// Cheap endpoint the bell polls every ~25 seconds.
router.get('/unread-count', async (req, res, next) => {
  try {
    res.json({ unread: await Notification.countDocuments({ userId: req.user._id, readAt: null }) });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const q = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      before: z.coerce.date().optional(), // cursor: only items older than this
    }).safeParse(req.query);
    if (!q.success) return res.status(400).json({ error: 'Invalid query' });

    const filter = { userId: req.user._id };
    if (q.data.before) filter.createdAt = { $lt: q.data.before };

    const rows = await Notification.find(filter).sort({ createdAt: -1 }).limit(q.data.limit + 1);
    const unread = await Notification.countDocuments({ userId: req.user._id, readAt: null });
    res.json({ items: rows.slice(0, q.data.limit).map(dto), hasMore: rows.length > q.data.limit, unread });
  } catch (err) { next(err); }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ unread: 0 });
  } catch (err) { next(err); }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
    await Notification.updateOne({ _id: req.params.id, userId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
