import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import OrganizerApplication from '../models/OrganizerApplication.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { notify } from '../utils/notify.js';

const router = Router();
const adminOnly = [requireAuth, requireRole('admin')];

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const blankToUndefined = (v) => (v === '' ? undefined : v);

const applySchema = z.object({
  orgName: z.string().trim().min(3, 'Enter the club or department name').max(100),
  orgType: z.enum(['club', 'department', 'society', 'other']),
  institution: z.string().trim().min(3, 'Enter your institution').max(120),
  registrationNumber: z.string().trim().min(3, 'Enter your registration or employee number').max(30),
  position: z.string().trim().min(2, 'Enter your role in the organization').max(60),
  facultyName: z.string().trim().min(2, 'Enter the faculty coordinator name').max(80),
  facultyEmail: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
  phone: z.preprocess(blankToUndefined, z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Enter a valid phone number').optional()),
  purpose: z.string().trim().min(20, 'Describe the events you plan in at least 20 characters').max(600),
  proofUrl: z.preprocess(blankToUndefined, z.string().trim().url('Enter a full link starting with https://').max(300).optional()),
});

const decisionSchema = z.object({ note: z.string().trim().max(500).optional() });

const dto = (a) => ({
  id: a._id.toString(),
  status: a.status,
  orgName: a.orgName,
  orgType: a.orgType,
  institution: a.institution,
  registrationNumber: a.registrationNumber,
  position: a.position,
  facultyName: a.facultyName,
  facultyEmail: a.facultyEmail,
  phone: a.phone || '',
  purpose: a.purpose,
  proofUrl: a.proofUrl || '',
  reviewNote: a.reviewNote || '',
  reviewedAt: a.reviewedAt,
  createdAt: a.createdAt,
});

const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

// 1. A signed-in student submits organizer details.
router.post('/', requireAuth, applyLimiter, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(400).json({ error: 'Your account already has organizer access', code: 'ALREADY_ORGANIZER' });
    }
    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Check the highlighted fields', fields: parsed.error.flatten().fieldErrors });
    if (await OrganizerApplication.exists({ userId: req.user._id, status: 'pending' })) {
      return res.status(409).json({ error: 'You already have a request waiting for review', code: 'ALREADY_PENDING' });
    }

    const app = await OrganizerApplication.create({ ...parsed.data, userId: req.user._id });
    const admins = await User.find({ role: 'admin' }).distinct('_id');
    notify(admins, { type: 'organizer_request', title: 'New organizer request', body: `${req.user.name} for ${app.orgName}`, link: '/admin/organizers' });
    res.status(201).json({ application: dto(app) });
  } catch (err) { next(err); }
});

// The applicant's most recent request, or null.
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const app = await OrganizerApplication.findOne({ userId: req.user._id }).sort('-createdAt');
    res.json({ application: app ? dto(app) : null });
  } catch (err) { next(err); }
});

// 2. Admin queue.
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const q = z.object({
      status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    }).safeParse(req.query);
    if (!q.success) return res.status(400).json({ error: 'Invalid filters' });
    const { status, page, limit } = q.data;

    const [rows, total, grouped] = await Promise.all([
      OrganizerApplication.find({ status }).sort(status === 'pending' ? 'createdAt' : '-reviewedAt').skip((page - 1) * limit).limit(limit).populate('userId', 'name email role'),
      OrganizerApplication.countDocuments({ status }),
      OrganizerApplication.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const existing = new Set((await Organization.find({ slug: { $in: rows.map((r) => slugify(r.orgName)) } }).select('slug')).map((o) => o.slug));

    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const g of grouped) counts[g._id] = g.n;
    res.json({
      items: rows.map((r) => ({
        ...dto(r),
        orgExists: existing.has(slugify(r.orgName)),
        applicant: r.userId ? { id: r.userId._id.toString(), name: r.userId.name, email: r.userId.email, role: r.userId.role } : null,
      })),
      total, page, limit, counts,
    });
  } catch (err) { next(err); }
});

async function loadPending(req, res) {
  const app = /^[a-f\d]{24}$/i.test(req.params.id) ? await OrganizerApplication.findById(req.params.id) : null;
  if (!app) { res.status(404).json({ error: 'Request not found' }); return null; }
  if (app.status !== 'pending') { res.status(409).json({ error: `This request was already ${app.status}`, code: 'ALREADY_DECIDED' }); return null; }
  return app;
}

// 3a. Approve: grants the organizer role and links the person to their organization.
router.post('/:id/approve', adminOnly, async (req, res, next) => {
  try {
    const app = await loadPending(req, res);
    if (!app) return;
    const body = decisionSchema.safeParse(req.body);
    const user = await User.findById(app.userId);
    if (!user) return res.status(404).json({ error: 'The applicant account no longer exists' });

    if (user.role === 'student') { user.role = 'organizer'; await user.save(); }

    const slug = slugify(app.orgName);
    let org = await Organization.findOne({ slug });
    if (!org) {
      org = await Organization.create({ name: app.orgName, slug, verified: true, members: [{ user: user._id, orgRole: 'owner' }] });
    } else if (!org.members.some((m) => m.user.equals(user._id))) {
      org.members.push({ user: user._id, orgRole: 'member' });
      await org.save();
    }

    app.status = 'approved';
    app.reviewedBy = req.user._id;
    app.reviewedAt = new Date();
    app.reviewNote = body.success ? body.data.note || '' : '';
    app.organizationId = org._id;
    await app.save();

    notify(user._id, { type: 'organizer_approved', title: 'Organizer access granted', body: `You can now create and manage events for ${org.name}.`, link: '/organizer', email: true });
    res.json({ application: dto(app) });
  } catch (err) { next(err); }
});

// 3b. Reject: the account stays a student account, so it cannot create or publish events.
router.post('/:id/reject', adminOnly, async (req, res, next) => {
  try {
    const app = await loadPending(req, res);
    if (!app) return;
    const body = z.object({ note: z.string().trim().min(5, 'Give the applicant a reason (at least 5 characters)').max(500) }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'A reason is required', fields: body.error.flatten().fieldErrors });

    app.status = 'rejected';
    app.reviewedBy = req.user._id;
    app.reviewedAt = new Date();
    app.reviewNote = body.data.note;
    await app.save();

    notify(app.userId, { type: 'organizer_rejected', title: 'Organizer request not approved', body: body.data.note, link: '/become-organizer', email: true });
    res.json({ application: dto(app) });
  } catch (err) { next(err); }
});

export default router;
