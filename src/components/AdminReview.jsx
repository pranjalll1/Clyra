'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import { formatWhen, formatPrice, MODE_LABEL } from '@/lib/format';
import ConfirmDialog from './ConfirmDialog';

const rangeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const range = (a, b) => `${rangeFmt.format(new Date(a))} to ${rangeFmt.format(new Date(b))}`;
const STATUS_LABEL = { published: 'Published', pending_approval: 'Pending review' };

function ClashBox({ e }) {
  const list = e.conflicts || [];
  if (!e.venueName) return null;
  if (!list.length) {
    return <p className="mt-4 border border-onyx bg-lime-muted p-3 text-sm font-semibold">No venue clash. The slot is free.</p>;
  }
  return (
    <div className={`mt-4 border-[1.5px] border-onyx p-3 text-sm ${e.needsOverride ? 'bg-coral-light' : 'bg-lime-muted'}`}>
      <p className="font-bold">
        {e.needsOverride
          ? 'Venue clash with a published event. Approving needs an override reason.'
          : 'Overlaps another event that is also waiting for review. The one you approve first keeps the slot.'}
      </p>
      <ul className="mt-2 space-y-1">
        {list.map((c) => (
          <li key={c.id}>{c.title} ({STATUS_LABEL[c.status] || c.status}), {range(c.startAt, c.endAt)}{c.organizationName ? `, ${c.organizationName}` : ''}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminReview() {
  const { user, loading: meLoading } = useMe();
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [dialog, setDialog] = useState(null); // { kind: 'approve' | 'reject', event }
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { ok, text }

  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      setItems((await api('/admin/events?status=pending_approval')).items);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  function openDialog(kind, event) {
    setText('');
    setDialog({ kind, event });
  }

  const needsText = !!dialog && (dialog.kind === 'reject' || dialog.event.needsOverride);

  async function confirm() {
    const { kind, event } = dialog;
    setBusy(true);
    try {
      if (kind === 'approve') {
        await api(`/admin/events/${event.id}/approve`, { method: 'POST', body: event.needsOverride ? { overrideReason: text } : {} });
      } else {
        await api(`/admin/events/${event.id}/reject`, { method: 'POST', body: { note: text } });
      }
      setNotice({ ok: true, text: `${kind === 'approve' ? 'Published' : 'Rejected'}: ${event.title}` });
    } catch (e) {
      setNotice({ ok: false, text: e.message });
    }
    setBusy(false);
    setDialog(null);
    load();
  }

  if (meLoading) return <p className="label-caps mx-auto max-w-5xl px-4 py-10">Loading...</p>;
  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-syne text-3xl font-extrabold tracking-tighter">Admin access needed</h1>
        <p className="mt-3">{user ? 'Only admin accounts can review events.' : 'Sign in with an admin account.'}</p>
        {!user && <Link href="/login" className="btn-primary mt-4 inline-block">Sign in</Link>}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="font-syne text-4xl font-extrabold leading-none tracking-tighter md:text-5xl">Review events</h1>
      <p className="mt-3 text-[15px] text-ink-muted">Events submitted by organizers, oldest first. Venue clashes are shown before you decide.</p>

      {state === 'loading' && items.length === 0 && <p className="label-caps mt-6">Loading...</p>}
      {state === 'error' && <p className="mt-6 font-semibold text-coral-dark">Could not load events. Refresh to try again.</p>}
      {state === 'ready' && items.length === 0 && <div className="card mt-6 p-8 text-center shadow-tactile"><p className="font-syne text-2xl font-extrabold">Nothing waiting for review</p></div>}

      <ul className="mt-6 space-y-6">
        {items.map((e) => (
          <li key={e.id} className="card p-5 shadow-tactile">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label-caps text-ink-muted">{e.shortCode} · {e.categoryName || 'No category'}</p>
                <h2 className="font-syne text-2xl font-extrabold leading-tight">{e.title}</h2>
                <p className="mt-1 text-sm">By {e.organizationName || 'Unknown club'}{e.submittedBy ? ` · submitted by ${e.submittedBy}` : ''}</p>
              </div>
              <span className="border border-onyx bg-lime-muted px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider">Pending</span>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
              <div><dt className="label-caps text-ink-muted">Starts</dt><dd>{formatWhen(e.startAt)}</dd></div>
              <div><dt className="label-caps text-ink-muted">Ends</dt><dd>{formatWhen(e.endAt)}</dd></div>
              <div><dt className="label-caps text-ink-muted">Venue</dt><dd>{e.venueName || MODE_LABEL[e.mode]}</dd></div>
              <div><dt className="label-caps text-ink-muted">Capacity · Entry</dt><dd>{e.capacity?.toLocaleString('en-IN')} · {formatPrice(e.price)}</dd></div>
            </dl>

            <ClashBox e={e} />

            <p className="mt-4 whitespace-pre-line text-sm">{(e.description || '').slice(0, 400)}{(e.description || '').length > 400 ? '...' : ''}</p>

            <div className="mt-4 flex flex-wrap gap-3 border-t border-onyx pt-4">
              <button type="button" className={e.needsOverride ? 'btn-coral' : 'btn-primary'} onClick={() => openDialog('approve', e)}>
                {e.needsOverride ? 'Approve with override' : 'Approve and publish'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => openDialog('reject', e)}>Reject</button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.kind === 'approve' ? (dialog.event.needsOverride ? 'Approve despite the clash?' : 'Approve and publish?') : 'Reject this event?'}
        message={
          dialog?.kind === 'approve'
            ? (dialog.event.needsOverride
              ? 'This overlaps a published event at the same venue. Write why you are overriding the clash. It is saved on the event.'
              : 'The event becomes public and students can register.')
            : 'The organizer sees your note, can fix the event and submit it again.'
        }
        confirmLabel={dialog?.kind === 'approve' ? (dialog.event.needsOverride ? 'Override and publish' : 'Publish') : 'Reject event'}
        tone={dialog?.kind === 'reject' || dialog?.event.needsOverride ? 'danger' : 'primary'}
        busy={busy}
        confirmDisabled={needsText && text.trim().length < 5}
        onConfirm={confirm}
        onClose={() => setDialog(null)}
      >
        {dialog && <p className="border border-onyx bg-surface-muted p-3 font-syne text-lg font-extrabold leading-tight">{dialog.event.title}</p>}
        {needsText && (
          <label className="mt-4 block">
            <span className="label-caps">{dialog.kind === 'reject' ? 'Reason (the organizer will see this)' : 'Override reason'}</span>
            <textarea className="field mt-2" rows={3} maxLength={dialog.kind === 'reject' ? 500 : 300} value={text} onChange={(ev) => setText(ev.target.value)} />
          </label>
        )}
      </ConfirmDialog>

      {notice && (
        <div role="status" className={`card fixed bottom-6 right-6 z-50 max-w-sm p-4 shadow-tactile ${notice.ok ? 'bg-lime' : 'bg-coral-light'}`}>
          <p className="text-sm font-semibold">{notice.text}</p>
        </div>
      )}
    </section>
  );
}