'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import EventCard from './EventCard';

const TIMING = [['all', 'Anytime'], ['today', 'Today'], ['week', 'Next 7 days'], ['weekend', 'This weekend']];
// [id, label, query string sent to GET /events]
const TABS = [['weekend', 'This weekend', 'when=weekend'], ['free', 'Free events', 'price=free'], ['popular', 'Most popular', 'sort=popular']];
const VENUE_LABEL = { auditorium: 'Auditorium', sports: 'Sports', hub: 'Hub', academic: 'Academic' };

const STUDENT_STEPS = [
  ['01', 'Discover', 'Search and filter every upcoming event by category, price, time and mode.'],
  ['02', 'Register', 'One tap reserves your seat. Cancel any time before the event starts.'],
  ['03', 'Show your QR', 'Your ticket lives in My bookings. Show the QR code at the gate.'],
];
const ORGANIZER_STEPS = [
  ['01', 'Create', 'Fill in the details. Drafts save automatically as you type.'],
  ['02', 'Clash check', 'The form tells you at once if the venue is already booked at that time.'],
  ['03', 'Get approved', 'An admin reviews the event and it goes live for students.'],
  ['04', 'Run the gate', 'Scan tickets with your camera and watch attendance fill in live.'],
];

function Grid({ items, empty }) {
  if (items === null) return <p className="label-caps">Loading events...</p>;
  if (items.length === 0) return <div className="card p-6 text-center shadow-tactile"><p className="font-syne text-xl font-extrabold">{empty}</p></div>;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((e) => <EventCard key={e.id} event={e} />)}
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="border-onyx p-4 [&:not(:first-child)]:md:border-l">
      <p className="font-syne text-4xl font-extrabold leading-none">{value}</p>
      <p className="label-caps mt-2 text-ink-muted">{label}</p>
    </div>
  );
}

function Steps({ title, steps, tone }) {
  return (
    <div className={`card p-6 shadow-tactile ${tone}`}>
      <h3 className="font-syne text-2xl font-extrabold">{title}</h3>
      <ol className="mt-4 space-y-4">
        {steps.map(([n, head, body]) => (
          <li key={n} className="flex gap-4">
            <span className="font-mono text-sm font-bold">{n}</span>
            <div>
              <p className="font-syne text-lg font-extrabold leading-tight">{head}</p>
              <p className="mt-1 text-sm">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Landing() {
  const router = useRouter();
  const { user } = useMe();

  const [q, setQ] = useState('');
  const [when, setWhen] = useState('all');
  const [cats, setCats] = useState([]);
  const [total, setTotal] = useState(null);
  const [stats, setStats] = useState(null);
  const [venues, setVenues] = useState([]);
  const [trending, setTrending] = useState(null); // null while loading
  const [tab, setTab] = useState('weekend');
  const [soon, setSoon] = useState(null);
  const [error, setError] = useState('');

  // Load categories (with counts), trending events, platform numbers and venues once.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api('/events?limit=1'),
      // Prefer events in the next 7 days; if there are none, show the most popular upcoming ones.
      api('/events?sort=popular&when=week&limit=3').then((d) => (d.items.length ? d : api('/events?sort=popular&limit=3'))),
      api('/stats').catch(() => null), // optional: the page still works if this route is missing
      api('/venues').catch(() => ({ items: [] })),
    ])
      .then(([all, hot, s, v]) => {
        if (cancelled) return;
        setCats(all.facets.categories);
        setTotal(all.total);
        setTrending(hot.items);
        setStats(s);
        setVenues(v.items || []);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load events. Check that the API is running.');
        setTrending([]);
      });
    return () => { cancelled = true; };
  }, []);

  // Load the "happening soon" row whenever the tab changes.
  useEffect(() => {
    let cancelled = false;
    setSoon(null);
    const qs = TABS.find((t) => t[0] === tab)[2];
    api(`/events?${qs}&limit=4`)
      .then((d) => { if (!cancelled) setSoon(d.items); })
      .catch(() => { if (!cancelled) setSoon([]); });
    return () => { cancelled = true; };
  }, [tab]);

  function search(e) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (when !== 'all') p.set('when', when);
    router.push(p.toString() ? `/events?${p}` : '/events');
  }

  const feature = trending?.[0];
  const isStaff = user && ['organizer', 'admin'].includes(user.role);
  const isStudent = user?.role === 'student';

  return (
    <div>
      {/* HERO */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-16">
        <div>
          <p className="sticker -rotate-1">Live on campus</p>
          <h1 className="mt-5 font-syne text-5xl font-extrabold leading-[0.95] tracking-tighter md:text-7xl">
            Find your next <span className="text-coral">campus event.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg">
            No more hunting through posters and forwarded messages. Hackathons, concerts, workshops and tournaments at LPU, in one place, with one tap to register.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/events" className="btn-coral">Explore events</Link>
            {isStudent ? (
              <Link href="/my-bookings" className="btn-ghost">My bookings</Link>
            ) : (
              <Link href={isStaff ? '/organizer' : '/login?tab=register'} className="btn-ghost">{isStaff ? 'Your events' : 'Create an account'}</Link>
            )}
          </div>
          {total !== null && (
            <p className="mt-6 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
              {total} upcoming event{total === 1 ? '' : 's'} &middot; {cats.length} categories
            </p>
          )}
        </div>

        <div className="hidden lg:block">
          {feature ? (
            <div className="rotate-1">
              <p className="sticker mb-3 inline-block">Trending now</p>
              <EventCard event={feature} />
            </div>
          ) : (
            <div className="card flex h-full min-h-[280px] items-center justify-center bg-surface-muted p-8 text-center shadow-tactile">
              <p className="font-syne text-3xl font-extrabold text-onyx/30">Your next event is waiting</p>
            </div>
          )}
        </div>
      </section>

      {/* SEARCH PANEL */}
      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <form onSubmit={search} className="grid gap-3 border-[1.5px] border-onyx bg-onyx p-4 shadow-tactile md:grid-cols-[1fr_220px_auto]">
          <label>
            <span className="sr-only">Search events</span>
            <input className="field" type="search" placeholder="Search hackathons, music, workshops..." value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label>
            <span className="sr-only">When</span>
            <select className="field" value={when} onChange={(e) => setWhen(e.target.value)}>
              {TIMING.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </label>
          <button type="submit" className="btn-coral">Search events</button>
        </form>
        {error && <p role="alert" className="mt-4 border-[1.5px] border-onyx bg-coral-light px-3 py-2 text-sm font-semibold text-coral-dark">{error}</p>}
      </section>

      {/* LIVE NUMBERS */}
      {stats && (
        <section className="mx-auto max-w-7xl px-4 pt-10 md:px-6">
          <div className="card grid grid-cols-2 shadow-tactile md:grid-cols-4">
            <Stat value={stats.events} label="Upcoming events" />
            <Stat value={stats.clubs} label="Clubs and societies" />
            <Stat value={stats.venues} label="Campus venues" />
            <Stat value={stats.registrations} label="Seats booked" />
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <h2 className="font-syne text-3xl font-extrabold tracking-tight">Explore categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link key={c.slug} href={`/events?category=${c.slug}`} className="chip">
              {c.name} <span className="ml-1 text-ink-muted">{c.count}</span>
            </Link>
          ))}
          {cats.length === 0 && !error && <p className="label-caps">Loading categories...</p>}
        </div>
      </section>

      {/* TRENDING */}
      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="sticker inline-block">Curated picks</p>
            <h2 className="mt-3 font-syne text-3xl font-extrabold tracking-tight md:text-4xl">Trending on campus</h2>
            <p className="mt-1 text-sm text-ink-muted">The events with the most students signed up.</p>
          </div>
          <Link href="/events?sort=popular" className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">View all</Link>
        </div>
        <div className="mt-6"><Grid items={trending} empty="No upcoming events yet" /></div>
      </section>

      {/* HAPPENING SOON */}
      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-syne text-3xl font-extrabold tracking-tight md:text-4xl">Happening soon</h2>
          <div className="flex gap-2" role="group" aria-label="Happening soon filter">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={tab === id} className={tab === id ? 'chip chip-on' : 'chip'} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="mt-6"><Grid items={soon} empty="Nothing here right now. Try another tab." /></div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <p className="sticker inline-block">How it works</p>
        <h2 className="mt-3 font-syne text-3xl font-extrabold tracking-tight md:text-4xl">From poster chaos to one place</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Steps title="For students" steps={STUDENT_STEPS} tone="bg-lime-muted" />
          <Steps title="For organizers" steps={ORGANIZER_STEPS} tone="bg-surface" />
        </div>
      </section>

      {/* VENUES */}
      {venues.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
          <h2 className="font-syne text-3xl font-extrabold tracking-tight md:text-4xl">Campus venues</h2>
          <p className="mt-1 text-sm text-ink-muted">Every space is tracked, so two events never end up in the same place at the same time.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {venues.slice(0, 4).map((v) => (
              <div key={v.id} className="card p-4 shadow-tactile">
                <span className="sticker">{VENUE_LABEL[v.type] || v.type}</span>
                <p className="mt-3 font-syne text-lg font-extrabold leading-tight">{v.name}</p>
                <p className="mt-1 text-sm text-ink-muted">{v.location}</p>
                <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider">Up to {v.capacity.toLocaleString('en-IN')} people</p>
              </div>
            ))}
          </div>
          {isStaff && <Link href="/organizer/venues" className="mt-4 inline-block font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">Check venue availability</Link>}
        </section>
      )}

      {/* ORGANIZER CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="border-[1.5px] border-onyx bg-onyx p-8 text-surface shadow-tactile md:p-12">
          <p className="sticker inline-block">For clubs and organizers</p>
          <h2 className="mt-4 max-w-2xl font-syne text-4xl font-extrabold leading-none tracking-tighter md:text-5xl">Hosting a club or org event?</h2>
          <p className="mt-4 max-w-xl text-surface/80">Create it once and Clyra handles the rest.</p>
          <ul className="mt-6 grid gap-3 text-sm md:grid-cols-3">
            <li className="border border-surface/30 p-4"><p className="font-bold text-lime">Clash-free venues</p><p className="mt-1">We warn you before two events book the same space at the same time.</p></li>
            <li className="border border-surface/30 p-4"><p className="font-bold text-lime">One-tap registration</p><p className="mt-1">Seat limits and cancellations are handled for you.</p></li>
            <li className="border border-surface/30 p-4"><p className="font-bold text-lime">QR check-in</p><p className="mt-1">Scan student tickets at the gate and track attendance live.</p></li>
          </ul>
          <Link href={isStaff ? '/organizer/events/new' : '/login?tab=register'} className="btn-coral mt-8 inline-block">
            {isStaff ? 'Create an event' : 'Create an account'}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-onyx bg-surface-low">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 md:px-6">
          <div>
            <p className="font-syne text-2xl font-extrabold tracking-tight">CLYRA</p>
            <p className="mt-1 text-sm text-ink-muted">Campus events at LPU. Built as a college project.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-4 font-mono text-xs font-bold uppercase tracking-wider">
            <Link href="/events" className="underline underline-offset-4">Events</Link>
            {isStudent && <Link href="/my-bookings" className="underline underline-offset-4">My bookings</Link>}
            <Link href={isStaff ? '/organizer' : '/login?tab=register'} className="underline underline-offset-4">Organize</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}