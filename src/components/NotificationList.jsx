'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import { timeAgo } from '@/lib/timeAgo';

export default function NotificationList() {
  const { user, loading: authLoading } = useMe();
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api('/notifications?limit=20')
      .then((d) => { setItems(d.items); setHasMore(d.hasMore); setState('ready'); })
      .catch(() => setState('error'));
  }, [user]);

  async function more() {
    setBusy(true);
    try {
      const before = encodeURIComponent(items[items.length - 1].createdAt);
      const d = await api(`/notifications?limit=20&before=${before}`);
      setItems((list) => [...list, ...d.items]);
      setHasMore(d.hasMore);
    } finally { setBusy(false); }
  }

  async function markAll() {
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }

  function open(n) {
    if (n.read) return;
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
  }

  if (authLoading) return <p className="mx-auto max-w-3xl px-4 py-12 label-caps">Loading</p>;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="mb-4 text-lg">Sign in to see your notifications.</p>
        <Link href="/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-syne text-4xl font-extrabold leading-none tracking-tighter md:text-5xl">Notifications</h1>
        <button type="button" onClick={markAll} className="btn-ghost">Mark all read</button>
      </div>

      <ul className="card mt-8 shadow-tactile">
        {state === 'ready' && items.length === 0 && <li className="px-4 py-10 text-ink-muted">Nothing yet. Updates about your events and registrations appear here.</li>}
        {state === 'loading' && <li className="px-4 py-8 label-caps">Loading</li>}
        {state === 'error' && <li className="px-4 py-8 font-semibold text-coral-dark">Could not load notifications. Refresh to try again.</li>}
        {items.map((n) => {
          const inner = (
            <span className="flex items-start gap-3">
              {!n.read ? <span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 bg-coral" /> : <span className="w-2 shrink-0" />}
              <span>
                <span className={`block ${n.read ? '' : 'font-bold'}`}>{n.title}</span>
                {n.body && <span className="block text-sm text-ink-muted">{n.body}</span>}
                <span className="mt-1 block font-mono text-xs text-ink-muted">{timeAgo(n.createdAt)}</span>
              </span>
            </span>
          );
          return (
            <li key={n.id} className="border-b border-onyx last:border-b-0">
              {n.link
                ? <Link href={n.link} onClick={() => open(n)} className="block px-4 py-4 hover:bg-lime-muted">{inner}</Link>
                : <button type="button" onClick={() => open(n)} className="block w-full px-4 py-4 text-left hover:bg-lime-muted">{inner}</button>}
            </li>
          );
        })}
      </ul>
      {hasMore && <button type="button" onClick={more} disabled={busy} className="btn-ghost mt-6">{busy ? 'Loading' : 'Load older'}</button>}
    </section>
  );
}
