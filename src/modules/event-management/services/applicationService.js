import { z } from 'zod';
import OrganizerApplication from '@/shared/models/OrganizerApplication.js';
import Organization from '@/shared/models/Organization.js';
import User from '@/shared/models/User.js';
import { notify } from '@/shared/server/notify.js';
import { jsonError, jsonOk } from '@/shared/server/response.js';

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

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

export const applicationDto = (a) => ({
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

export async function submitOrganizerApplication(user, body) {
  if (user.role !== 'student') {
    return jsonError('Your account already has organizer access', 400, { code: 'ALREADY_ORGANIZER' });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Check the highlighted fields', 400, { fields: parsed.error.flatten().fieldErrors });
  }

  if (await OrganizerApplication.exists({ userId: user._id, status: 'pending' })) {
    return jsonError('You already have a request waiting for review', 409, { code: 'ALREADY_PENDING' });
  }

  const app = await OrganizerApplication.create({ ...parsed.data, userId: user._id });
  const admins = await User.find({ role: 'admin' }).distinct('_id');
  notify(admins, {
    type: 'organizer_request',
    title: 'New organizer request',
    body: `${user.name} for ${app.orgName}`,
    link: '/admin/organizers',
  });

  return jsonOk({ application: applicationDto(app) }, 201);
}

export async function getMyApplication(user) {
  const app = await OrganizerApplication.findOne({ userId: user._id }).sort('-createdAt');
  return jsonOk({ application: app ? applicationDto(app) : null });
}

export async function listOrganizerApplications(searchParams) {
  const q = z
    .object({
      status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    })
    .safeParse(Object.fromEntries(searchParams));

  if (!q.success) return jsonError('Invalid filters', 400);
  const { status, page, limit } = q.data;

  const [rows, total, grouped] = await Promise.all([
    OrganizerApplication.find({ status })
      .sort(status === 'pending' ? 'createdAt' : '-reviewedAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email role'),
    OrganizerApplication.countDocuments({ status }),
    OrganizerApplication.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);

  const existing = new Set(
    (await Organization.find({ slug: { $in: rows.map((r) => slugify(r.orgName)) } }).select('slug')).map((o) => o.slug)
  );

  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const g of grouped) counts[g._id] = g.n;

  return jsonOk({
    items: rows.map((r) => ({
      ...applicationDto(r),
      orgExists: existing.has(slugify(r.orgName)),
      applicant: r.userId
        ? { id: r.userId._id.toString(), name: r.userId.name, email: r.userId.email, role: r.userId.role }
        : null,
    })),
    total,
    page,
    limit,
    counts,
  });
}

async function loadPendingApplication(id) {
  const app = /^[a-f\d]{24}$/i.test(id) ? await OrganizerApplication.findById(id) : null;
  if (!app) return { error: jsonError('Request not found', 404) };
  if (app.status !== 'pending') {
    return { error: jsonError(`This request was already ${app.status}`, 409, { code: 'ALREADY_DECIDED' }) };
  }
  return { app };
}

export async function approveOrganizerApplication(id, adminUser, body) {
  const { app, error } = await loadPendingApplication(id);
  if (error) return error;

  const parsedBody = decisionSchema.safeParse(body);
  const applicant = await User.findById(app.userId);
  if (!applicant) return jsonError('The applicant account no longer exists', 404);

  if (applicant.role === 'student') {
    applicant.role = 'organizer';
    await applicant.save();
  }

  const slug = slugify(app.orgName);
  let org = await Organization.findOne({ slug });
  if (!org) {
    org = await Organization.create({
      name: app.orgName,
      slug,
      verified: true,
      members: [{ user: applicant._id, orgRole: 'owner' }],
    });
  } else if (!org.members.some((m) => m.user.equals(applicant._id))) {
    org.members.push({ user: applicant._id, orgRole: 'member' });
    await org.save();
  }

  app.status = 'approved';
  app.reviewedBy = adminUser._id;
  app.reviewedAt = new Date();
  app.reviewNote = parsedBody.success ? parsedBody.data.note || '' : '';
  app.organizationId = org._id;
  await app.save();

  notify(applicant._id, {
    type: 'organizer_approved',
    title: 'Organizer access granted',
    body: `You can now create and manage events for ${org.name}.`,
    link: '/organizer',
    email: true,
  });

  return jsonOk({ application: applicationDto(app) });
}

export async function rejectOrganizerApplication(id, adminUser, body) {
  const { app, error } = await loadPendingApplication(id);
  if (error) return error;

  const parsedBody = z
    .object({ note: z.string().trim().min(5, 'Give the applicant a reason (at least 5 characters)').max(500) })
    .safeParse(body);

  if (!parsedBody.success) {
    return jsonError('A reason is required', 400, { fields: parsedBody.error.flatten().fieldErrors });
  }

  app.status = 'rejected';
  app.reviewedBy = adminUser._id;
  app.reviewedAt = new Date();
  app.reviewNote = parsedBody.data.note;
  await app.save();

  notify(app.userId, {
    type: 'organizer_rejected',
    title: 'Organizer request not approved',
    body: parsedBody.data.note,
    link: '/become-organizer',
    email: true,
  });

  return jsonOk({ application: applicationDto(app) });
}
