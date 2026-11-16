import { Router } from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import OrganizerApplication from '../models/OrganizerApplication.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/stats', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const Registration = mongoose.models.Registration; // registered by the events routes
    const [pendingOrganizers, pendingEvents, publishedEvents, totalEvents, organizers, students, venues, registrations] = await Promise.all([
      OrganizerApplication.countDocuments({ status: 'pending' }),
      Event.countDocuments({ status: 'pending_approval', archivedAt: null }),
      Event.countDocuments({ status: 'published', archivedAt: null }),
      Event.countDocuments({ archivedAt: null }),
      User.countDocuments({ role: 'organizer' }),
      User.countDocuments({ role: 'student' }),
      Venue.countDocuments({ isActive: true }),
      Registration ? Registration.countDocuments({ status: 'registered' }) : 0, // cancelled registrations are not counted
    ]);
    res.json({ pendingOrganizers, pendingEvents, publishedEvents, totalEvents, organizers, students, venues, registrations });
  } catch (err) { next(err); }
});

export default router;
