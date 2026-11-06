'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import { formatDate, formatWindow, formatWhen, formatPrice, MODE_LABEL } from '@/lib/format';

// Text for the states the server reports when you are NOT registered.
function regCopy(event) {
  switch (event.registrationState) {
    case 'open': return { title: 'Registration open', note: 'Reserve your seat for this event.' };
    case 'full': return { title: 'Event full', note: 'All seats are taken. Check back in case someone cancels.' };
    case 'not_open_yet': return { title: 'Not open yet', note: `Registration opens ${formatWhen(event.registrationOpensAt)}.` };
    case 'closed': return { title: 'Registration closed', note: 'The registration window has ended.' };
    case 'paused': return { title: 'Registration paused', note: 'The organizer has paused registration for now.' };
    default: return { title: 'Event ended', note: 'This event has already taken place.' };
  }
}

function Fact({ label, value }) {
  return (
    <div className="border-onyx p-3 [&:not(:first-child)]:border-l">
      <p className="label-caps text-ink-muted">{label}</p>
      <p className="mt-1 font-syne text-base font-extrabold leading-tight">{value}</p>
    </div>
  );
}

export default function EventDetail() {
  const { slug } = useParams();
  const { user, loading: meLoading } = useMe();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null); // an ApiError
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const eventPath = `/events/by-slug/${encodeURIComponent(slug)}`;

  // Fetch when the slug changes. `cancelled` ignores a slow old response.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api(eventPath)
      .then((d) => { if (!cancelled) setEvent(d.event); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventPath]);

  // method = 'POST' (register) or 'DELETE' (cancel). Afterwards we reload the event so the page shows what the server says.
  async function act(method) {
    setBusy(true);
    setActionError('');
    try {
      await api(`/events/${event.id}/register`, { method });
    } catch (e) {
      setActionError(e.message);
    }
    try {
      const d = await api(eventPath);
      setEvent(d.event);
    } catch { /* keep showing the old data */ }
    setBusy(false);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: ignore */ }
  }

  if (loading) return <p className="label-caps mx-auto max-w-7xl px-4 py-10">Loading event...</p>;

  if (error) {
    const missing = error.status === 404;
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="card p-8 text-center shadow-tactile">
          <p className="font-syne text-3xl font-extrabold">{missing ? 'Event not found' : 'Something went wrong'}</p>
          <p className="mt-2 text-sm">{missing ? 'It may have been removed, or the link is wrong.' : error.message}</p>
          <Link href="/events" className="btn-primary mt-6 inline-block">Back to events</Link>
        </div>
      </section>
    );
  }

  const reg = regCopy(event);
  const isStudent = user?.role === 'student';
  const registered = !!event.myRegistration;
  const canRegister = event.registrationState === 'open';

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <Link href="/events" className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">← All events</Link>
      <p className="label-caps mt-4 text-ink-muted">Event {event.shortCode}</p>

      <div className="mt-4 grid gap-8 lg:grid-cols-[3fr_2fr]">
        {/* LEFT: poster, facts, about */}
        <div className="space-y-6">
          <div className="card shadow-tactile">
            <div className="relative aspect-[16/9] border-b-[1.5px] border-onyx bg-surface-muted">
              {event.posterUrl ? (
                <img src={event.posterUrl} alt={event.posterAlt || ''} className="h-full w-full object-cover" />
              ) : (
                <div aria-hidden="true" className="flex h-full items-center justify-center font-syne text-8xl font-extrabold text-onyx/20">
                  {event.title.slice(0, 2).toUpperCase()}
                </div>
              )}
              {event.categoryName && <span className="sticker absolute left-3 top-3">{event.categoryName}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4">
              <Fact label="Date" value={formatDate(event.startAt)} />
              <Fact label="Window" value={formatWindow(event.startAt, event.endAt)} />
              <Fact label="Venue" value={event.venueName || MODE_LABEL[event.mode]} />
              <Fact label="Mode" value={MODE_LABEL[event.mode]} />
            </div>
          </div>

          <div className="card flex items-center justify-between gap-4 p-4">
            <div>
              <p className="label-caps text-ink-muted">Organized by</p>
              <p className="font-syne text-lg font-extrabold">{event.organizationName || 'Campus organizer'}</p>
            </div>
            <button type="button" onClick={share} className="chip">{copied ? 'Link copied' : 'Share event'}</button>
          </div>

          <div className="card p-6">
            <h2 className="font-syne text-2xl font-extrabold">About this event</h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed">{event.description || 'No description yet.'}</p>
          </div>
        </div>

        {/* RIGHT: title and registration */}
        <div className="space-y-6">
          <h1 className="break-words font-syne text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">{event.title}</h1>

          <div className="grid grid-cols-2 border-[1.5px] border-onyx bg-surface shadow-tactile">
            <Fact label="Entry" value={formatPrice(event.price)} />
            <Fact label="Seats left" value={event.seatsLeft == null ? 'Unlimited' : `${event.seatsLeft} of ${event.capacity}`} />
          </div>

          <div className="card space-y-3 p-5 shadow-tactile" aria-live="polite">
            <p className="label-caps text-ink-muted">Registration</p>

            {registered ? (
              <>
                <p className="font-syne text-2xl font-extrabold">You are registered</p>
                <p className="text-sm">Your seat is reserved. You can cancel until the event starts.</p>
                <button type="button" disabled={busy} onClick={() => act('DELETE')} className="btn-ghost w-full disabled:opacity-50">
                  {busy ? 'Cancelling...' : 'Cancel registration'}
                </button>
              </>
            ) : (
              <>
                <p className="font-syne text-2xl font-extrabold">{reg.title}</p>
                <p className="text-sm">{reg.note}</p>

                {canRegister && !meLoading && !user && (
                  <Link href="/login" className="btn-primary block w-full text-center">Sign in to register</Link>
                )}
                {canRegister && user && !isStudent && (
                  <p className="border border-onyx bg-surface-muted p-3 text-sm">Only student accounts can register for events.</p>
                )}
                {canRegister && isStudent && (
                  <button type="button" disabled={busy} onClick={() => act('POST')} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? 'Registering...' : 'Register now'}
                  </button>
                )}
                {!canRegister && (
                  <button type="button" disabled className="btn-primary w-full cursor-not-allowed opacity-50">{reg.title}</button>
                )}
              </>
            )}

            {actionError && <p role="alert" className="border border-coral-dark bg-coral-light p-3 text-sm">{actionError}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}