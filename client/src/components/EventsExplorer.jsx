'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import EventCard from './EventCard';
import EventFilters from './EventFilters';
import Pagination from './Pagination';

const WHEN = [['all', 'Anytime'], ['today', 'Today'], ['week', 'Next 7 days'], ['weekend', 'This weekend']];
const FILTER_KEYS = ['q', 'category', 'price', 'mode', 'venueType'];

export default function EventsExplorer() {
  const router = useRouter();
  const sp = useSearchParams();
  const query = sp.toString();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qInput, setQInput] = useState(sp.get('q') || '');

  // Change the URL. Empty values remove the param. Any filter change goes back to page 1.
  const setParams = useCallback((updates) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === undefined || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in updates)) next.delete('page');
    const s = next.toString();
    router.replace(s ? `/events?${s}` : '/events', { scroll: false });
  }, [sp, router]);

  // Wait 350 ms after the student stops typing before searching.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get('q') || '') !== qInput.trim()) setParams({ q: qInput.trim() });
    }, 350);
    return () => clearTimeout(t);
  }, [qInput, sp, setParams]);

  // Fetch whenever the URL changes. `cancelled` stops an old, slow response from overwriting a newer one.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api(`/events${query ? `?${query}` : ''}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  const values = {
    category: sp.get('category') || '',
    price: sp.get('price') || '',
    mode: sp.get('mode') || '',
    venueType: sp.get('venueType') || '',
  };
  const when = sp.get('when') || 'all';
  const sort = sp.get('sort') || 'soonest';
  const page = Number(sp.get('page')) || 1;
  const hasFilters = FILTER_KEYS.some((k) => sp.get(k)) || when !== 'all';

  function reset() {
    setQInput('');
    router.replace('/events', { scroll: false });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <p className="sticker -rotate-1">Upcoming at LPU</p>
      <h1 className="mt-4 font-syne text-5xl font-extrabold leading-[0.95] tracking-tighter md:text-7xl">Campus events</h1>

      <div className="mt-8 flex flex-col gap-3 md:flex-row">
        <label className="flex-1">
          <span className="sr-only">Search events</span>
          <input className="field" type="search" placeholder="Search by event title..." value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </label>
        <label className="md:w-56">
          <span className="sr-only">Sort by</span>
          <select className="field" value={sort} onChange={(e) => setParams({ sort: e.target.value === 'soonest' ? '' : e.target.value })}>
            <option value="soonest">Sort: Soonest first</option>
            <option value="newest">Sort: Newly added</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="When">
        <span className="label-caps mr-1">When</span>
        {WHEN.map(([val, label]) => (
          <button key={val} type="button" aria-pressed={when === val} className={when === val ? 'chip chip-on' : 'chip'} onClick={() => setParams({ when: val === 'all' ? '' : val })}>
            {label}
          </button>
        ))}
        {hasFilters && <button type="button" onClick={reset} className="ml-auto font-mono text-xs font-bold uppercase tracking-wider text-coral-dark underline underline-offset-4">Reset all</button>}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <EventFilters facets={data?.facets} values={values} setParams={setParams} />

        <div>
          {error && <p role="alert" className="card border-coral-dark bg-coral-light p-4 text-sm">{error}</p>}

          {!error && data && (
            <p className="label-caps mb-4 text-ink-muted" aria-live="polite">
              Showing {data.items.length} of {data.total} {data.total === 1 ? 'event' : 'events'}
            </p>
          )}

          {!data && loading && <p className="label-caps">Loading events...</p>}

          {data && data.items.length === 0 && !error && (
            <div className="card p-8 text-center shadow-tactile">
              <p className="font-syne text-2xl font-extrabold">No events match</p>
              <p className="mt-2 text-sm">Try removing a filter or searching for something else.</p>
              {hasFilters && <button onClick={reset} className="btn-primary mt-4">Reset all filters</button>}
            </div>
          )}

          {data && data.items.length > 0 && (
            <div className={`grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}

          {data && <Pagination page={data.page} totalPages={data.totalPages} onPage={(n) => { setParams({ page: n }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        </div>
      </div>
    </section>
  );
}