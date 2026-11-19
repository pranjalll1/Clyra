'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/timeAgo';

const POLL_MS = 25000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const last = useRef(null); // previous unread count, to spot new arrivals
  const box = useRef(null);

  // Cheap poll: just the unread count. If it went up, show a toast for the newest item.
  const poll = useCallback(async () => {
    try {
      const { unread: n } = await api('/notifications/unread-count');
      if (last.current !== null && n > last.current) {
        const { items: latest } = await api('/notifications?limit=1');
        if (latest[0] && !latest[0].read) toast(latest[0].title, { description: latest[0].body || undefined });
      }
      last.current = n;
      setUnread(n);
    } catch { /* offline or signed out: try again next tick */ }
  }, []);

  useEffect(() => {
    poll();
    const tick = () => { if (document.visibilityState === 'visible') poll(); };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [poll]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try { setItems((await api('/notifications?limit=8')).items); } catch { /* keep old list */ }
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  async function markRead(n) {
    if (n.read) return;
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((c) => { last.current = Math.max(0, c - 1); return Math.max(0, c - 1); });
    api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
  }

  async function markAll() {
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0); last.current = 0;
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={`Notifications, ${unread} unread`}
        className="relative border border-onyx bg-surface p-2 hover:bg-lime">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 min-w-[20px] border border-onyx bg-coral px-1 text-center font-mono text-[11px] font-bold leading-5 text-onyx">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="region" aria-label="Notifications" className="card absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[90vw] shadow-tactile-lg">
          <div className="flex items-center justify-between border-b border-onyx bg-surface-muted px-3 py-2">
            <p className="label-caps">Notifications</p>
            <button type="button" onClick={markAll} disabled={unread === 0} className="text-sm font-semibold underline underline-offset-2 disabled:opacity-40">Mark all read</button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-3 py-6 text-sm text-ink-muted">Nothing yet. Updates about your events and registrations appear here.</li>}
            {items.map((n) => {
              const inner = (
                <>
                  <span className="flex items-start gap-2">
                    {!n.read && <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 bg-coral" />}
                    <span>
                      <span className={`block text-sm ${n.read ? '' : 'font-bold'}`}>{n.title}</span>
                      {n.body && <span className="block text-sm text-ink-muted">{n.body}</span>}
                      <span className="mt-1 block font-mono text-xs text-ink-muted">{timeAgo(n.createdAt)}</span>
                    </span>
                  </span>
                </>
              );
              return (
                <li key={n.id} className="border-b border-onyx last:border-b-0">
                  {n.link
                    ? <Link href={n.link} onClick={() => { markRead(n); setOpen(false); }} className="block px-3 py-3 hover:bg-lime-muted">{inner}</Link>
                    : <button type="button" onClick={() => markRead(n)} className="block w-full px-3 py-3 text-left hover:bg-lime-muted">{inner}</button>}
                </li>
              );
            })}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-onyx px-3 py-2 text-center font-mono text-xs font-bold uppercase tracking-wider hover:bg-lime">See all</Link>
        </div>
      )}
    </div>
  );
}
