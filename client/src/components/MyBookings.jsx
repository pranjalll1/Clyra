'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import { formatDate, formatWindow, formatPrice, MODE_LABEL } from '@/lib/format';

const TABS = [['upcoming', 'Upcoming'], ['past', 'Past']];

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-onyx/20 py-2 text-sm last:border-0">
      <span className="label-caps text-ink-muted">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

// The big ticket on the right.
function Ticket({ item, user, active }) {
  const e = item.event;
  return (
    <article className="card shadow-tactile-lg">
      <div className="border-b-[1.5px] border-onyx bg-onyx p-6 text-surface">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-lime">
          {active ? 'Pass active' : 'Event ended'} // {item.ticketCode}
        </p>
        <h2 className="mt-3 break-words font-syne text-3xl font-extrabold leading-none tracking-tight md:text-5xl">{e.title}</h2>
        {e.organizationName && <p className="mt-3 font-mono text-xs uppercase tracking-wider text-surface/70">{e.organizationName}</p>}
      </div>

      <div className="grid grid-cols-2 border-b-[1.5px] border-onyx md:grid-cols-4">
        {[
          ['Date', formatDate(e.startAt)],
          ['Time', formatWindow(e.startAt, e.endAt)],
          ['Venue', e.venueName || MODE_LABEL[e.mode]],
          ['Entry', formatPrice(e.price)],
        ].map(([label, value]) => (
          <div key={label} className="border-onyx p-3 [&:not(:first-child)]:border-l">
            <p className="label-caps text-ink-muted">{label}</p>
            <p className="mt-1 font-syne text-sm font-extrabold leading-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr]">
        <div>
          <div className={`inline-block border-[1.5px] border-onyx bg-white p-2 shadow-tactile ${active ? '' : 'opacity-30'}`}>
            <QRCodeSVG value={`CLYRA:${item.ticketCode}`} size={260} marginSize={4} level="M" bgColor="#FFFFFF" fgColor="#000000" role="img" aria-label={`QR code for ticket ${item.ticketCode}`} />
          </div>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
            {active ? 'Show this at the gate' : 'No longer valid'}
          </p>
        </div>

        <div className="border-[1.5px] border-onyx bg-surface-muted p-4">
          <p className="label-caps mb-2">Holder</p>
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
          {user.department && <Row label="Department" value={user.department} />}
          <Row label="Ticket ID" value={item.ticketCode} />
        </div>
      </div>

      <div className="border-t-[1.5px] border-onyx p-4">
        <Link href={`/events/${e.slug}`} className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">
          View event page{active ? ' or cancel' : ''} →
        </Link>
      </div>
    </article>
  );
}

export default function MyBookings() {
  const router = useRouter();
  const { user, loading: meLoading } = useMe();
  const [tab, setTab] = useState('upcoming');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const isStudent = user?.role === 'student';

  // Signed-out visitors go to login (after we know for sure who they are).
  useEffect(() => {
    if (!meLoading && !user) router.replace('/login');
  }, [meLoading, user, router]);

  // Load the list whenever the tab changes.
  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api(`/events/mine/registrations?tab=${tab}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setSelectedId(d.items[0]?.registrationId ?? null);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab, isStudent]);

  if (meLoading || !user) return <p className="label-caps mx-auto max-w-7xl px-4 py-10">Loading...</p>;

  if (!isStudent) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="card p-8 text-center shadow-tactile">
          <p className="font-syne text-3xl font-extrabold">Students only</p>
          <p className="mt-2 text-sm">Bookings belong to student accounts.</p>
        </div>
      </section>
    );
  }

  const items = data?.items || [];
  const selected = items.find((i) => i.registrationId === selectedId) || items[0];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <p className="sticker -rotate-1">Student gateway</p>
      <h1 className="mt-4 font-syne text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">My bookings</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
        {/* LEFT: tabs and list */}
        <div className="space-y-4">
          <div className="flex gap-2" role="group" aria-label="Booking filter">
            {TABS.map(([val, label]) => (
              <button key={val} type="button" aria-pressed={tab === val} className={tab === val ? 'chip chip-on' : 'chip'} onClick={() => setTab(val)}>
                {label}{data ? ` (${data.counts[val]})` : ''}
              </button>
            ))}
          </div>

          {error && <p role="alert" className="card border-coral-dark bg-coral-light p-4 text-sm">{error}</p>}
          {loading && !data && <p className="label-caps">Loading bookings...</p>}

          {!loading && !error && items.length === 0 && (
            <div className="card p-6 text-center shadow-tactile">
              <p className="font-syne text-xl font-extrabold">{tab === 'upcoming' ? 'No upcoming bookings' : 'No past events yet'}</p>
              {tab === 'upcoming' && <Link href="/events" className="btn-primary mt-4 inline-block">Browse events</Link>}
            </div>
          )}

          <ul className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
            {items.map((i) => {
              const on = i.registrationId === selected?.registrationId;
              return (
                <li key={i.registrationId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(i.registrationId)}
                    aria-pressed={on}
                    className={`card w-full p-4 text-left ${on ? 'bg-lime-muted shadow-tactile' : ''}`}
                  >
                    <p className="label-caps text-ink-muted">{formatDate(i.event.startAt)}</p>
                    <p className="mt-1 font-syne text-lg font-extrabold leading-tight">{i.event.title}</p>
                    <p className="mt-1 text-sm">{i.event.venueName || MODE_LABEL[i.event.mode]}</p>
                    <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink-muted">Ticket {i.ticketCode}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* RIGHT: selected ticket */}
        <div>{selected && <Ticket item={selected} user={user} active={tab === 'upcoming'} />}</div>
      </div>
    </section>
  );
}