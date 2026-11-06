'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';

const EMPTY = {
  title: '', organizationId: '', categoryId: '', description: '', mode: 'in_person', venueId: '',
  startAt: '', endAt: '', capacity: '', waitlistEnabled: true, waitlistCapPercent: 5,
  registrationOpensAt: '', registrationClosesAt: '', isFree: true, amountINR: 0,
};

// <input type="datetime-local"> works in the browser's local time; the API stores UTC.
const pad = (n) => String(n).padStart(2, '0');
const toInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toIso = (v) => (v ? new Date(v).toISOString() : null);

const fromDto = (e) => ({
  title: e.title, organizationId: e.organizationId, categoryId: e.categoryId || '', description: e.description || '', mode: e.mode,
  venueId: e.venueId || '', startAt: toInput(e.startAt), endAt: toInput(e.endAt), capacity: e.capacity ?? '',
  waitlistEnabled: e.waitlistEnabled, waitlistCapPercent: e.waitlistCapPercent,
  registrationOpensAt: toInput(e.registrationOpensAt), registrationClosesAt: toInput(e.registrationClosesAt),
  isFree: e.price?.isFree ?? true, amountINR: e.price?.amountINR ?? 0,
});

const toPayload = (f, { create }) => ({
  ...(create ? { organizationId: f.organizationId } : {}),
  title: f.title.trim(), categoryId: f.categoryId || null, description: f.description, mode: f.mode, venueId: f.venueId || null,
  startAt: toIso(f.startAt), endAt: toIso(f.endAt), capacity: f.capacity === '' ? null : Number(f.capacity),
  waitlistEnabled: f.waitlistEnabled, waitlistCapPercent: Number(f.waitlistCapPercent) || 0,
  registrationOpensAt: toIso(f.registrationOpensAt), registrationClosesAt: toIso(f.registrationClosesAt),
  price: { isFree: f.isFree, amountINR: f.isFree ? 0 : Number(f.amountINR) || 0 },
});

function Field({ id, label, children, hint, error }) {
  return (
    <div>
      <label htmlFor={id} className="label-caps">{label}</label>
      <div className="mt-2">{children}</div>
      {hint && !error && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-coral-dark">{error}</p>}
    </div>
  );
}

export default function EventForm({ eventId }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [cats, setCats] = useState([]);
  const [venues, setVenues] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState({ done: 0, total: 6, missing: [] });
  const [status, setStatus] = useState(eventId ? 'loading' : 'idle'); // loading | idle | dirty | saving | saved | error | notfound
  const [info, setInfo] = useState({ code: '', status: 'draft', rejectionNote: null });
  const dirty = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    Promise.all([api('/categories'), api('/venues'), api('/organizations/mine')]).then(([c, v, o]) => {
      setCats(c.items); setVenues(v.items); setOrgs(o.items);
      setForm((f) => (f.organizationId || eventId ? f : { ...f, organizationId: o.items[0]?.id || '' }));
    });
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    api(`/events/${eventId}`)
      .then(({ event, completeness }) => {
        setForm(fromDto(event)); setProgress(completeness); setStatus('idle');
        setInfo({ code: event.shortCode, status: event.status, rejectionNote: event.rejectionNote });
      })
      .catch(() => setStatus('notfound'));
  }, [eventId]);

  const set = (k) => (e) => change({ [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  function change(patch) {
    setForm((f) => ({ ...f, ...patch }));
    dirty.current = true;
    if (eventId) { setStatus('dirty'); clearTimeout(timer.current); timer.current = setTimeout(save, 1500); }
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  const formRef = useRef(form);
  formRef.current = form;

  async function save() {
    clearTimeout(timer.current);
    setStatus('saving'); setErrors({});
    try {
      if (!eventId) {
        const { event } = await api('/events', { method: 'POST', body: toPayload(formRef.current, { create: true }) });
        router.replace(`/organizer/events/${event.id}`);
        return;
      }
      const { completeness } = await api(`/events/${eventId}`, { method: 'PATCH', body: toPayload(formRef.current, { create: false }) });
      setProgress(completeness); dirty.current = false; setStatus('saved');
    } catch (err) {
      setStatus('error');
      if (err instanceof ApiError) setErrors(err.fields);
    }
  }

  const venue = venues.find((v) => v.id === form.venueId);
  const err = (k) => errors[k]?.[0];
  const editable = ['draft', 'rejected'].includes(info.status);
  const statusText = { loading: 'Loading', idle: eventId ? 'All changes saved' : 'Not saved yet', dirty: 'Unsaved changes', saving: 'Saving', saved: 'All changes saved', error: 'Could not save. Fix the highlighted fields.' }[status];

  if (status === 'notfound') {
    return <div className="mx-auto max-w-lg px-4 py-16"><p className="text-lg">This event does not exist or you do not have access to it.</p><Link href="/organizer" className="btn-ghost mt-4">Back to your events</Link></div>;
  }

  const cls = (id) => `field ${err(id) ? 'field-error' : ''}`;
  const aria = (id) => ({ 'aria-invalid': !!err(id), 'aria-describedby': err(id) ? `${id}-err` : undefined, disabled: !editable && !!eventId });

  return (
    <div className="pb-28">
      <section className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <Link href="/organizer" className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">Your events</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-syne text-4xl font-extrabold leading-none tracking-tighter md:text-5xl">{eventId ? 'Edit event' : 'New event'}</h1>
          {info.code && <span className="border border-onyx bg-surface-muted px-2 py-1 font-mono text-xs font-semibold">{info.code}</span>}
        </div>
        {info.status === 'rejected' && info.rejectionNote && (
          <p className="mt-4 border-[1.5px] border-onyx bg-coral-light px-3 py-2 text-sm font-semibold text-coral-dark">Rejected by admin: {info.rejectionNote}</p>
        )}
        {!eventId && <p className="mt-3 text-[15px] text-ink-muted">Start with a title. Save the draft, then fill in the rest; changes save automatically.</p>}

        <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate className="mt-8 space-y-10">
          <fieldset className="card space-y-5 p-5 shadow-tactile">
            <legend className="sticker -ml-1">Basics</legend>
            <Field id="title" error={err('title')} label="Event title">
              <input id="title" className={cls('title')} value={form.title} onChange={set('title')} maxLength={120} {...aria('title')} />
            </Field>
            {!eventId && orgs.length > 1 && (
              <Field id="organizationId" error={err('organizationId')} label="Organizing club">
                <select id="organizationId" className={cls('organizationId')} value={form.organizationId} onChange={set('organizationId')}>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Field>
            )}
            {!eventId && orgs.length === 0 && <p className="text-sm font-semibold text-coral-dark">Your account is not linked to a club yet, so you cannot create events. Ask an admin to add you to one.</p>}
            <fieldset>
              <legend className="label-caps">Category</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {cats.map((c) => (
                  <label key={c.id || c._id} className={`flex cursor-pointer items-center gap-3 border border-onyx px-3 py-3 text-sm font-semibold ${form.categoryId === (c._id) ? 'bg-lime' : 'bg-surface hover:bg-lime-muted'}`}>
                    <input type="radio" name="category" className="h-4 w-4 accent-onyx" checked={form.categoryId === c._id} onChange={() => change({ categoryId: c._id })} disabled={!editable && !!eventId} />
                    {c.name}
                  </label>
                ))}
              </div>
              {err('categoryId') && <p className="mt-1 text-sm font-semibold text-coral-dark">{err('categoryId')}</p>}
            </fieldset>
            <Field id="description" error={err('description')} label="Description" hint="Markdown is supported. Say what happens, who it is for and what to bring.">
              <textarea id="description" rows={7} className={cls('description')} value={form.description} onChange={set('description')} {...aria('description')} />
            </Field>
          </fieldset>

          <fieldset className="card space-y-5 p-5 shadow-tactile">
            <legend className="sticker -ml-1">When and where</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="startAt" error={err('startAt')} label="Starts"><input id="startAt" type="datetime-local" className={cls('startAt')} value={form.startAt} onChange={set('startAt')} {...aria('startAt')} /></Field>
              <Field id="endAt" error={err('endAt')} label="Ends"><input id="endAt" type="datetime-local" className={cls('endAt')} value={form.endAt} onChange={set('endAt')} {...aria('endAt')} /></Field>
            </div>
            <Field id="venueId" error={err('venueId')} label="Venue">
              <select id="venueId" className={cls('venueId')} value={form.venueId} onChange={set('venueId')} {...aria('venueId')}>
                <option value="">Choose a venue</option>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name} (up to {v.capacity.toLocaleString('en-IN')})</option>)}
              </select>
            </Field>
            {venue && (
              <div className="border border-onyx bg-surface-muted p-3">
                <p className="text-sm font-semibold">{venue.location} &middot; holds up to {venue.capacity.toLocaleString('en-IN')}{venue.units > 1 ? ` · ${venue.units} separate spaces` : ''}</p>
                <ul className="mt-2 flex flex-wrap gap-2">{venue.amenities.map((a) => <li key={a} className="border border-onyx bg-surface px-2 py-1 text-xs">{a}</li>)}</ul>
              </div>
            )}
          </fieldset>

          <fieldset className="card space-y-5 p-5 shadow-tactile">
            <legend className="sticker -ml-1">Registration</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="capacity" error={err('capacity')} label="Capacity" hint={venue ? `${venue.name} holds up to ${venue.capacity.toLocaleString('en-IN')}.` : 'Choose a venue to see its limit.'}>
                <input id="capacity" type="number" min="1" inputMode="numeric" className={cls('capacity')} value={form.capacity} onChange={set('capacity')} {...aria('capacity')} />
              </Field>
              <Field id="waitlistCapPercent" error={err('waitlistCapPercent')} label="Waitlist size (% of capacity)">
                <input id="waitlistCapPercent" type="number" min="0" max="50" className={cls('waitlistCapPercent')} value={form.waitlistCapPercent} onChange={set('waitlistCapPercent')} disabled={!form.waitlistEnabled || (!editable && !!eventId)} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-onyx" checked={form.waitlistEnabled} onChange={set('waitlistEnabled')} disabled={!editable && !!eventId} />
              Open a waitlist when the event is full
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="registrationOpensAt" error={err('registrationOpensAt')} label="Registration opens"><input id="registrationOpensAt" type="datetime-local" className={cls('registrationOpensAt')} value={form.registrationOpensAt} onChange={set('registrationOpensAt')} {...aria('registrationOpensAt')} /></Field>
              <Field id="registrationClosesAt" error={err('registrationClosesAt')} label="Registration closes"><input id="registrationClosesAt" type="datetime-local" className={cls('registrationClosesAt')} value={form.registrationClosesAt} onChange={set('registrationClosesAt')} {...aria('registrationClosesAt')} /></Field>
            </div>
            <div className="grid items-end gap-5 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5 accent-onyx" checked={form.isFree} onChange={set('isFree')} disabled={!editable && !!eventId} />
                Free entry
              </label>
              {!form.isFree && (
                <Field id="amountINR" error={err('amountINR')} label="Price shown to students (₹)" hint="Display only. Payments are not handled by Clyra.">
                  <input id="amountINR" type="number" min="0" className={cls('amountINR')} value={form.amountINR} onChange={set('amountINR')} />
                </Field>
              )}
            </div>
          </fieldset>
        </form>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-onyx bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <p aria-live="polite" className="font-mono text-xs font-semibold uppercase tracking-wider">
            Required {progress.done}/{progress.total} &middot; {statusText}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={status === 'saving' || (!editable && !!eventId) || (!eventId && (!form.title.trim() || !form.organizationId))} className="btn-ghost">
              {eventId ? 'Save now' : 'Save draft'}
            </button>
            <button type="button" disabled className="btn-primary" title="Submitting for approval arrives with the clash checks">Submit for approval</button>
          </div>
        </div>
      </div>
    </div>
  );
}
