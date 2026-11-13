'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const IST = 'Asia/Kolkata';
const DAYS = 14;
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: IST }); // 2026-11-11
const dayLabel = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST });
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: IST });
const rangeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: IST });
const STATUS = { published: ['Published', 'bg-lime'], pending_approval: ['Pending review', 'bg-lime-muted'] };

export default function VenueAvailability() {
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState('');
  const [startDay, setStartDay] = useState(() => dayKey(new Date())); // yyyy-mm-dd
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [slotResult, setSlotResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [slotError, setSlotError] = useState('');

  // 1) Load the venue list once and pick the first one.
  useEffect(() => {
    api('/venues')
      .then((d) => { setVenues(d.items); if (d.items[0]) setVenueId(d.items[0].id); })
      .catch(() => setError('Could not load venues. Refresh to try again.'));
  }, []);

  // 2) Load that venue's bookings for 14 days whenever the venue or the start day changes.
  useEffect(() => {
    if (!venueId || !startDay) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setSlotResult(null);
    const from = new Date(`${startDay}T00:00:00+05:30`);
    const to = new Date(from.getTime() + DAYS * 86400000);
    api(`/venues/${venueId}/schedule?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
      .then((d) => { if (!cancelled) setSchedule(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [venueId, startDay]);

  const days = useMemo(() => {
    const from = new Date(`${startDay}T00:00:00+05:30`);
    const byDay = new Map();
    for (const b of schedule?.bookings || []) {
      const k = dayKey(b.startAt);
      byDay.set(k, [...(byDay.get(k) || []), b]);
    }
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(from.getTime() + i * 86400000);
      return { key: dayKey(d), label: dayLabel(d), bookings: byDay.get(dayKey(d)) || [] };
    });
  }, [schedule, startDay]);

  async function checkSlot(e) {
    e.preventDefault();
    setSlotError('');
    setSlotResult(null);
    if (!slotStart || !slotEnd || new Date(slotEnd) <= new Date(slotStart)) {
      setSlotError('Choose a start, and an end that is after it.');
      return;
    }
    setChecking(true);
    try {
      const qs = new URLSearchParams({ startAt: new Date(slotStart).toISOString(), endAt: new Date(slotEnd).toISOString() });
      setSlotResult(await api(`/venues/${venueId}/clash-check?${qs}`));
    } catch (err) {
      setSlotError(err.message);
    }
    setChecking(false);
  }

  const venue = schedule?.venue;
  const busyDays = days.filter((d) => d.bookings.length).length;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <p className="sticker -rotate-1">Venues</p>
      <h1 className="mt-4 font-syne text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">Venue availability</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-ink-muted">See what is booked at a venue for the next two weeks, and test a time slot before you create an event.</p>

      <div className="card mt-8 grid gap-4 p-4 shadow-tactile sm:grid-cols-2">
        <label>
          <span className="label-caps">Venue</span>
          <select className="field mt-2" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label>
          <span className="label-caps">Start from</span>
          <input type="date" className="field mt-2" value={startDay} onChange={(e) => e.target.value && setStartDay(e.target.value)} />
        </label>
      </div>

      {error && <p role="alert" className="mt-4 border-[1.5px] border-onyx bg-coral-light px-3 py-2 text-sm font-semibold text-coral-dark">{error}</p>}

      {venue && (
        <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="card p-4 shadow-tactile">
            <p className="label-caps text-ink-muted">{venue.code}</p>
            <h2 className="font-syne text-2xl font-extrabold leading-tight">{venue.name}</h2>
            <p className="mt-1 text-sm">{venue.location} · holds up to {venue.capacity.toLocaleString('en-IN')} · hosts up to {venue.units} event{venue.units === 1 ? '' : 's'} at once</p>
            <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider">{schedule.bookings.length} booking{schedule.bookings.length === 1 ? '' : 's'} on {busyDays} of {DAYS} days</p>
          </div>

          <form onSubmit={checkSlot} className="card space-y-3 p-4 shadow-tactile">
            <p className="label-caps">Check a time slot</p>
            <input type="datetime-local" className="field" aria-label="Slot starts" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
            <input type="datetime-local" className="field" aria-label="Slot ends" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
            <button type="submit" disabled={checking} className="btn-primary w-full disabled:opacity-50">{checking ? 'Checking...' : 'Check this slot'}</button>
            {slotError && <p role="alert" className="text-sm font-semibold text-coral-dark">{slotError}</p>}
            {slotResult && (slotResult.clash ? (
              <div role="status" className="border-[1.5px] border-onyx bg-coral-light p-3 text-sm">
                <p className="font-bold text-coral-dark">Clash. This slot is taken.</p>
                <ul className="mt-1 space-y-1">{slotResult.conflicts.map((c) => (
                  <li key={c.id}>{c.title} ({STATUS[c.status]?.[0] || c.status}), {rangeFmt.format(new Date(c.startAt))} to {rangeFmt.format(new Date(c.endAt))}</li>
                ))}</ul>
              </div>
            ) : (
              <p role="status" className="border-[1.5px] border-onyx bg-lime-muted p-3 text-sm font-semibold">This slot is free.</p>
            ))}
          </form>
        </div>
      )}

      <div className={`mt-6 space-y-3 ${loading ? 'opacity-60' : ''}`}>
        {days.map((d) => (
          <div key={d.key} className="card flex flex-col gap-3 p-4 md:flex-row md:items-start">
            <p className="w-32 shrink-0 font-syne text-lg font-extrabold">{d.label}</p>
            {d.bookings.length === 0 ? (
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">Free all day</p>
            ) : (
              <ul className="flex-1 space-y-2">
                {d.bookings.map((b) => {
                  const [label, cls] = STATUS[b.status] || [b.status, 'bg-surface-muted'];
                  return (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 border border-onyx bg-surface-muted p-3">
                      <div>
                        <p className="font-bold">{b.title}</p>
                        <p className="font-mono text-xs text-ink-muted">{timeFmt.format(new Date(b.startAt))} to {timeFmt.format(new Date(b.endAt))}{b.organizationName ? ` · ${b.organizationName}` : ''} · {b.shortCode}</p>
                      </div>
                      <span className={`border border-onyx px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider ${cls}`}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}