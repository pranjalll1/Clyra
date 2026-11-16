'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import { timeAgo } from '@/lib/timeAgo';

const EMPTY = {
  orgName: '', orgType: 'club', institution: 'Lovely Professional University', registrationNumber: '', position: '',
  facultyName: '', facultyEmail: '', phone: '', purpose: '', proofUrl: '',
};

const STEPS = ['Submit your details', 'Admin review', 'Decision'];

function Stepper({ status }) {
  // status: null (not applied), pending, approved, rejected
  const current = status === null ? 0 : status === 'pending' ? 1 : 2;
  return (
    <ol className="grid gap-2 sm:grid-cols-3" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < current || (i === 2 && (status === 'approved' || status === 'rejected'));
        const active = i === current && !done;
        const text = i === 2 && status === 'approved' ? 'Approved: access granted' : i === 2 && status === 'rejected' ? 'Rejected: access denied' : label;
        return (
          <li key={label} aria-current={active ? 'step' : undefined}
            className={`border-[1.5px] border-onyx px-3 py-3 ${done ? (status === 'rejected' && i === 2 ? 'bg-coral-light' : 'bg-lime') : active ? 'bg-surface shadow-tactile' : 'bg-surface-muted'}`}>
            <p className="font-mono text-xs font-bold uppercase tracking-wider">Step {i + 1}</p>
            <p className="mt-1 font-syne text-base font-bold leading-tight">{text}</p>
          </li>
        );
      })}
    </ol>
  );
}

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label-caps">{label}</label>
      <div className="mt-2">{children}</div>
      {hint && !error && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-coral-dark">{error}</p>}
    </div>
  );
}

export default function BecomeOrganizerForm() {
  const { user, loading: authLoading } = useMe();
  const [app, setApp] = useState(undefined); // undefined = loading, null = none
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [reapply, setReapply] = useState(false);

  useEffect(() => {
    if (!user) return;
    api('/organizer-applications/mine').then((d) => setApp(d.application)).catch(() => setApp(null));
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k) => errors[k]?.[0];
  const cls = (k) => `field ${err(k) ? 'field-error' : ''}`;
  const aria = (k) => ({ 'aria-invalid': !!err(k), 'aria-describedby': err(k) ? `${k}-err` : undefined });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      const d = await api('/organizer-applications', { method: 'POST', body: form });
      setApp(d.application); setReapply(false);
    } catch (ex) {
      if (ex instanceof ApiError) { setErrors(ex.fields); setMessage(ex.message); } else setMessage('Could not reach the server. Try again.');
    } finally { setBusy(false); }
  }

  if (authLoading) return <p className="mx-auto max-w-3xl px-4 py-12 label-caps">Loading</p>;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-syne text-3xl font-extrabold tracking-tighter">Become an organizer</h1>
        <p className="mt-3">Create an account or sign in first, then submit your organization details for review.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/login?tab=register" className="btn-primary">Create account</Link>
          <Link href="/login" className="btn-ghost">Sign in</Link>
        </div>
      </div>
    );
  }
  if (user.role !== 'student') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-syne text-3xl font-extrabold tracking-tighter">You already have access</h1>
        <p className="mt-3">Your account can create and manage events.</p>
        <Link href="/organizer" className="btn-primary mt-6">Go to your events</Link>
      </div>
    );
  }
  if (app === undefined) return <p className="mx-auto max-w-3xl px-4 py-12 label-caps">Loading</p>;

  const showForm = app === null || (app.status === 'rejected' && reapply);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="font-syne text-4xl font-extrabold leading-none tracking-tighter md:text-5xl">Become an organizer</h1>
      <p className="mt-3 max-w-xl text-[15px] text-ink-muted">Organizers create and publish events. An admin checks your organization and institution details before access is granted.</p>

      <div className="mt-8"><Stepper status={showForm ? null : app?.status ?? null} /></div>

      {app?.status === 'pending' && (
        <div className="card mt-8 p-5 shadow-tactile" aria-live="polite">
          <p className="font-syne text-xl font-bold">Your request is under review</p>
          <p className="mt-2 text-sm">Submitted {timeAgo(app.createdAt)} for <strong>{app.orgName}</strong>. You will get a notification and an email when an admin decides.</p>
        </div>
      )}

      {app?.status === 'approved' && (
        <div className="card mt-8 bg-lime-muted p-5 shadow-tactile" aria-live="polite">
          <p className="font-syne text-xl font-bold">Access granted</p>
          <p className="mt-2 text-sm">You can now create and manage events for {app.orgName}.</p>
          <Link href="/organizer" className="btn-primary mt-4">Create your first event</Link>
        </div>
      )}

      {app?.status === 'rejected' && !reapply && (
        <div className="card mt-8 bg-coral-light p-5 shadow-tactile" aria-live="polite">
          <p className="font-syne text-xl font-bold">Request not approved</p>
          <p className="mt-2 text-sm">Until a request is approved, this account cannot create or publish events.</p>
          {app.reviewNote && <p className="mt-3 border-l-4 border-coral-dark pl-3 text-sm"><strong>Reason from admin:</strong> {app.reviewNote}</p>}
          <button type="button" onClick={() => { setReapply(true); setForm({ ...EMPTY, orgName: app.orgName, orgType: app.orgType, institution: app.institution, registrationNumber: app.registrationNumber, position: app.position, facultyName: app.facultyName, facultyEmail: app.facultyEmail }); }} className="btn-primary mt-4">Fix details and apply again</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} noValidate className="mt-8 space-y-8">
          <fieldset className="card space-y-5 p-5 shadow-tactile">
            <legend className="sticker -ml-1">Organization</legend>
            <Field id="orgName" label="Club or department name" error={err('orgName')}><input id="orgName" className={cls('orgName')} value={form.orgName} onChange={set('orgName')} {...aria('orgName')} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="orgType" label="Type" error={err('orgType')}>
                <select id="orgType" className={cls('orgType')} value={form.orgType} onChange={set('orgType')}>
                  <option value="club">Club</option><option value="society">Society</option><option value="department">Department</option><option value="other">Other</option>
                </select>
              </Field>
              <Field id="position" label="Your role there" hint="For example: President, Coordinator" error={err('position')}><input id="position" className={cls('position')} value={form.position} onChange={set('position')} {...aria('position')} /></Field>
            </div>
            <Field id="purpose" label="What events will you organize?" hint="At least 20 characters" error={err('purpose')}>
              <textarea id="purpose" rows={4} className={cls('purpose')} value={form.purpose} onChange={set('purpose')} {...aria('purpose')} />
            </Field>
          </fieldset>

          <fieldset className="card space-y-5 p-5 shadow-tactile">
            <legend className="sticker -ml-1">Institution and verification</legend>
            <Field id="institution" label="Institution" error={err('institution')}><input id="institution" className={cls('institution')} value={form.institution} onChange={set('institution')} {...aria('institution')} /></Field>
            <Field id="registrationNumber" label="Registration or employee number" error={err('registrationNumber')}><input id="registrationNumber" className={cls('registrationNumber')} value={form.registrationNumber} onChange={set('registrationNumber')} {...aria('registrationNumber')} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="facultyName" label="Faculty coordinator name" error={err('facultyName')}><input id="facultyName" className={cls('facultyName')} value={form.facultyName} onChange={set('facultyName')} {...aria('facultyName')} /></Field>
              <Field id="facultyEmail" label="Faculty coordinator email" error={err('facultyEmail')}><input id="facultyEmail" type="email" className={cls('facultyEmail')} value={form.facultyEmail} onChange={set('facultyEmail')} {...aria('facultyEmail')} /></Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="phone" label="Phone (optional)" error={err('phone')}><input id="phone" type="tel" className={cls('phone')} value={form.phone} onChange={set('phone')} {...aria('phone')} /></Field>
              <Field id="proofUrl" label="Link to proof (optional)" hint="A club page or a letter of approval" error={err('proofUrl')}><input id="proofUrl" type="url" className={cls('proofUrl')} value={form.proofUrl} onChange={set('proofUrl')} placeholder="https://" {...aria('proofUrl')} /></Field>
            </div>
          </fieldset>

          <div aria-live="polite">{message && <p className="border-[1.5px] border-onyx bg-coral-light px-3 py-2 text-sm font-semibold text-coral-dark">{message}</p>}</div>
          <button type="submit" disabled={busy} className="btn-coral">{busy ? 'Submitting' : 'Submit for review'}</button>
        </form>
      )}
    </section>
  );
}
