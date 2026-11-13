'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";


const TABS = [['all', 'All events'], ['published', 'Published'], ['pending_approval', 'Pending approval'], ['draft', 'Drafts'], ['rejected', 'Rejected']];
const STATUS = {
  draft: ['Draft', 'bg-surface-muted'],
  pending_approval: ['Pending admin review', 'bg-lime-muted'],
  published: ['Published', 'bg-lime'],
  rejected: ['Rejected', 'bg-coral-light text-coral-dark'],
  cancelled: ['Cancelled', 'bg-surface-muted'],
  completed: ['Completed', 'bg-surface-muted'],
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : 'Not scheduled');

export default function OrganizerDashboard() {
  const confirm = useConfirm();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], counts: {}, total: 0, limit: 10 });
  const [state, setState] = useState('loading'); // loading | ready | error
  const [reloadKey, setReloadKey] = useState(0); // bump this number to reload the list
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setState('loading');
    const t = setTimeout(() => {
      api(`/organizer/events?status=${status}&q=${encodeURIComponent(q)}&page=${page}`)
        .then((d) => { setData(d); setState('ready'); })
        .catch(() => setState('error'));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [status, q, page, reloadKey]);

  // action: 'pause' (toggles pause/resume) or 'cancel'. The server decides; we reload the list afterwards.
  async function manage(e, action) {
    setMsg('');
    try {
      if (action === 'cancel') {
        const reason = window.prompt(
          `Cancel "${e.title}"?\nIt disappears from discovery and registered students see it as cancelled.\n\nOptional reason (OK = cancel the event, Cancel = keep it):`,
          ''
        );
        if (reason === null) return;
        await api(`/events/${e.id}/cancel`, { method: 'POST', body: { reason } });
      } else {
        await api(`/events/${e.id}/registration`, { method: 'PATCH', body: { paused: !e.registrationPaused } });
      }
    } catch (err) {
      setMsg(err.message);
    }
    setReloadKey((k) => k + 1);
  }

  const pages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-syne text-4xl font-extrabold leading-none tracking-tighter md:text-5xl">Your events</h1>
          <p className="mt-3 max-w-xl text-[15px] text-ink-muted">Drafts, submissions and published events for your clubs.</p>
        </div>
        <Link href="/organizer/events/new" className="btn-coral">Create event</Link>
      </div>

      <div className="card mt-8 p-4 shadow-tactile">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={status === id} onClick={() => { setStatus(id); setPage(1); }}
              className={`border border-onyx px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider ${status === id ? 'bg-onyx text-lime' : 'hover:bg-lime'}`}>
              {label} <span className="ml-1">{data.counts[id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label htmlFor="q" className="sr-only">Search events</label>
        <input id="q" className="field mt-4" placeholder="Search by title or event code" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>

      {msg && <p role="alert" className="mt-4 border-[1.5px] border-onyx bg-coral-light px-3 py-2 text-sm font-semibold text-coral-dark">{msg}</p>}

      <div className="mt-6 overflow-x-auto border-[1.5px] border-onyx">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-surface-muted">
            <tr className="border-b border-onyx">
              {['Event', 'Schedule', 'Status', 'Capacity', 'Price', ''].map((h) => (
                <th key={h} scope="col" className="label-caps px-4 py-3">{h || <span className="sr-only">Actions</span>}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state === 'ready' && data.items.map((e) => {
              const [label, cls] = STATUS[e.status] || [e.status, 'bg-surface-muted'];
              return (
                <tr key={e.id} className="border-b border-onyx last:border-b-0 hover:bg-lime">
                  <td className="px-4 py-4">
                    <p className="font-syne text-lg font-bold leading-tight">{e.title}</p>
                    <p className="mt-1 font-mono text-xs text-ink-muted">{e.shortCode}{e.venueName ? ` · ${e.venueName}` : ' · No venue yet'}</p>
                  </td>
                  <td className="px-4 py-4 text-sm">{fmt(e.startAt)}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-block border border-onyx px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider ${cls}`}>{label}</span>
                    {e.status === 'published' && e.registrationPaused && (
                      <span className="mt-1 block font-mono text-xs font-bold uppercase tracking-wider text-coral-dark">Registration paused</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {e.status === 'published'
                      ? `${e.registeredCount ?? 0} / ${e.capacity?.toLocaleString('en-IN')}`
                      : e.capacity ? e.capacity.toLocaleString('en-IN') : 'Not set'}
                  </td>
                  <td className="px-4 py-4 text-sm">{e.price?.isFree ? 'Free' : `₹${e.price?.amountINR}`}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {['draft', 'rejected'].includes(e.status) && (
                        <Link href={`/organizer/events/${e.id}`} className="btn-ghost">{e.status === 'draft' ? 'Continue editing' : 'Edit'}</Link>
                      )}
                      {e.status === 'published' && (
                        <>
                          <Link href={`/organizer/events/${e.id}/gate`} className="btn-ghost">Gate &amp; roster</Link>
                          <button type="button" className="btn-ghost" onClick={() => manage(e, 'pause')}>
                            {e.registrationPaused ? 'Resume registration' : 'Pause registration'}
                          </button>
                          <button type="button" className="btn-ghost text-coral-dark" onClick={() => manage(e, 'cancel')}>Cancel event</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div aria-live="polite">
          {state === 'loading' && <p className="px-4 py-8 font-mono text-sm">Loading events</p>}
          {state === 'error' && <p className="px-4 py-8 text-coral-dark font-semibold">Could not load your events. Refresh to try again.</p>}
          {state === 'ready' && data.items.length === 0 && (
            <p className="px-4 py-10">{q || status !== 'all' ? 'No events match this filter.' : 'You have no events yet. Create your first event to see it here.'}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider">
        <span>{data.total} event{data.total === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </section>
  );
}
"use client";
import { toast } from "sonner";


// inside your dashboard component, where `events` / `setEvents` already exist


// Replace one event in the list instead of reloading the page
const patchRow = (updated) =>
  setEvents((list) => list.map((e) => (e._id === updated._id ? updated : e)));

async function handlePause(ev) {
  const ok = await confirm({
    title: "Pause registration?",
    message: `Students won't be able to register for "${ev.title}" until you resume.`,
    confirmText: "Pause",
    tone: "warning",
  });
  if (!ok) return;                              // user clicked Go back / Esc / backdrop
  try {
    const updated = await callApi(ev, "pause"); // your existing API call (see below)
    patchRow(updated);                          // only this row re-renders
    toast.success("Registration paused");
  } catch (err) {
    toast.error(err.message || "Could not pause registration");
  }
}

async function handleResume(ev) {
  const ok = await confirm({
    title: "Resume registration?",
    message: "Students will be able to register again right away.",
    confirmText: "Resume",
  });
  if (!ok) return;
  try {
    patchRow(await callApi(ev, "resume"));
    toast.success("Registration resumed");
  } catch (err) { toast.error(err.message || "Could not resume"); }
}

async function handleCancelEvent(ev) {
  const res = await confirm({
    title: "Cancel this event?",
    message: "This hides it from students and marks their bookings as cancelled.",
    askReason: true,                            // shows the reason textarea
    confirmText: "Cancel event",
    cancelText: "Keep event",
    tone: "danger",
  });
  if (!res) return;
  try {
    patchRow(await callApi(ev, "cancel", { reason: res.reason }));
    toast.success("Event cancelled");
  } catch (err) { toast.error(err.message || "Could not cancel"); }
}