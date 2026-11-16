'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import { timeAgo } from '@/lib/timeAgo';

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']];
const TYPE = { club: 'Club', society: 'Society', department: 'Department', other: 'Other' };

function Row({ label, children }) {
  return (
    <div className="border-b border-onyx py-2 sm:grid sm:grid-cols-[170px_1fr] sm:gap-3">
      <dt className="label-caps text-ink-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm sm:mt-0">{children || <span className="text-ink-muted">Not given</span>}</dd>
    </div>
  );
}

function RequestCard({ a, onDone }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'approve' | 'reject'
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function decide() {
    setBusy(true); setError('');
    try {
      await api(`/organizer-applications/${a.id}/${mode}`, { method: 'POST', body: { note } });
      toast.success(mode === 'approve' ? `Approved ${a.applicant?.name || 'applicant'}` : 'Request rejected');
      onDone();
    } catch (ex) {
      setError(ex instanceof ApiError ? ex.fields?.note?.[0] || ex.message : 'Could not reach the server.');
    } finally { setBusy(false); }
  }

  const statusCls = { pending: 'bg-lime-muted', approved: 'bg-lime', rejected: 'bg-coral-light text-coral-dark' }[a.status];

  return (
    <li className="card shadow-tactile">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-lime-muted">
        <span>
          <span className="block font-syne text-xl font-extrabold leading-tight">{a.orgName}</span>
          <span className="block text-sm">{a.applicant?.name} &middot; {a.applicant?.email}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-xs text-ink-muted">{timeAgo(a.createdAt)}</span>
          <span className={`border border-onyx px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider ${statusCls}`}>{a.status}</span>
        </span>
      </button>

      {open && (
        <div className="border-t-[1.5px] border-onyx p-4">
          <dl>
            <Row label="Organization">{a.orgName} ({TYPE[a.orgType]})</Row>
            <Row label="Their role">{a.position}</Row>
            <Row label="Institution">{a.institution}</Row>
            <Row label="Registration no.">{a.registrationNumber}</Row>
            <Row label="Faculty coordinator">{a.facultyName} &middot; <a className="underline" href={`mailto:${a.facultyEmail}`}>{a.facultyEmail}</a></Row>
            <Row label="Phone">{a.phone}</Row>
            <Row label="Planned events">{a.purpose}</Row>
            <Row label="Proof">{a.proofUrl && <a className="underline" href={a.proofUrl} target="_blank" rel="noopener noreferrer">Open link<span className="sr-only"> (new tab)</span></a>}</Row>
            {a.status !== 'pending' && <Row label="Admin note">{a.reviewNote}</Row>}
          </dl>

          {a.orgExists && a.status === 'pending' && (
            <p className="mt-4 border-[1.5px] border-onyx bg-lime-muted px-3 py-2 text-sm">An organization with this name already exists. Approving adds this person to it as a member. Check that they belong there.</p>
          )}

          {a.status === 'pending' && (
            <div className="mt-5">
              {!mode ? (
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setMode('approve')} className="btn-primary">Approve</button>
                  <button type="button" onClick={() => setMode('reject')} className="btn-ghost">Reject</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label htmlFor={`note-${a.id}`} className="label-caps">{mode === 'reject' ? 'Reason for the applicant (required)' : 'Note for the applicant (optional)'}</label>
                  <textarea id={`note-${a.id}`} rows={3} className="field" value={note} onChange={(e) => setNote(e.target.value)} />
                  {error && <p className="text-sm font-semibold text-coral-dark" role="alert">{error}</p>}
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={decide} disabled={busy || (mode === 'reject' && note.trim().length < 5)} className={mode === 'reject' ? 'btn-coral' : 'btn-primary'}>
                      {busy ? 'Saving' : mode === 'reject' ? 'Confirm rejection' : 'Confirm approval'}
                    </button>
                    <button type="button" onClick={() => { setMode(null); setError(''); }} disabled={busy} className="btn-ghost">Go back</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function OrganizerRequests() {
  const { user, loading: authLoading } = useMe();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], counts: {}, total: 0, limit: 10 });
  const [state, setState] = useState('loading');

  const load = useCallback(() => {
    setState('loading');
    api(`/organizer-applications?status=${status}&page=${page}`).then((d) => { setData(d); setState('ready'); }).catch(() => setState('error'));
  }, [status, page]);

  useEffect(() => { if (user?.role === 'admin') load(); }, [user, load]);

  if (authLoading) return <p className="mx-auto max-w-4xl px-4 py-12 label-caps">Loading</p>;
  if (user?.role !== 'admin') {
    return <div className="mx-auto max-w-lg px-4 py-16"><h1 className="font-syne text-3xl font-extrabold tracking-tighter">Admin access needed</h1><p className="mt-3">Sign in with an admin account to review organizer requests.</p></div>;
  }

  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <h1 className="font-syne text-4xl font-extrabold leading-none tracking-tighter md:text-5xl">Organizer requests</h1>
      <p className="mt-3 text-[15px] text-ink-muted">Check the organization and institution details. Approving gives the person access to create and manage events.</p>

      <div role="tablist" aria-label="Request status" className="mt-8 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={status === id} onClick={() => { setStatus(id); setPage(1); }}
            className={`border border-onyx px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider ${status === id ? 'bg-onyx text-lime' : 'hover:bg-lime'}`}>
            {label} <span className="ml-1">{data.counts[id] ?? 0}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {state === 'ready' && data.items.map((a) => <RequestCard key={a.id} a={a} onDone={load} />)}
      </ul>
      <div aria-live="polite">
        {state === 'loading' && <p className="mt-6 label-caps">Loading</p>}
        {state === 'error' && <p className="mt-6 font-semibold text-coral-dark">Could not load requests. Refresh to try again.</p>}
        {state === 'ready' && data.items.length === 0 && <p className="card mt-6 p-8 text-center">{status === 'pending' ? 'No requests are waiting. New ones appear here and in your notifications.' : `No ${status} requests yet.`}</p>}
      </div>

      {pages > 1 && (
        <div className="mt-6 flex items-center gap-3 font-mono text-xs uppercase tracking-wider">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
