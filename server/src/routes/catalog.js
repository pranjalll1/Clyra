import { Router } from 'express';
import Category from '../models/Category.js';
import Venue from '../models/Venue.js';
import Organization from '../models/Organization.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/categories', async (_req, res, next) => {
  try {
    res.json({ items: await Category.find().sort('order').lean() });
  } catch (err) { next(err); }
});

router.get('/venues', async (_req, res, next) => {
  try {
    const items = await Venue.find({ isActive: true }).sort('name').lean();
    res.json({ items: items.map(({ _id, ...v }) => ({ id: _id.toString(), ...v })) });
  } catch (err) { next(err); }
});

router.get('/organizations/mine', requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { 'members.user': req.user._id };
    const orgs = await Organization.find(filter).sort('name').lean();
    res.json({ items: orgs.map((o) => ({ id: o._id.toString(), name: o.name, verified: o.verified })) });
  } catch (err) { next(err); }
});

export default router;
