'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';

function Stat({ label, value, href, flag }) {
  const body = (
    <div className={`card h-full p-4 shadow-tactile ${flag ? 'border-t-[6px] border-t-coral' : ''}`}>
      <p className="label-caps text-ink-muted">{label}</p>
      <p className="mt-2 font-syne text-4xl font-extrabold leading-none">{value ?? '...'}</p>
      {href && <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">Open</p>}
    </div>
  );
  return href ? <Link href={href} className="block transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px]">{body}</Link> : body;
}

export default function AdminDashboard() {
  const { user, loading } = useMe();
  const [s, setS] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api('/admin-dashboard/stats').then(setS).catch(() => setError(true));
  }, [user]);

  if (loading) return <p className="mx-auto max-w-6xl px-4 py-12 label-caps">Loading</p>;
  if (user?.role !== 'admin') {
    return <div className="mx-auto max-w-lg px-4 py-16"><h1 className="font-syne text-3xl font-extrabold tracking-tighter">Admin access needed</h1><p className="mt-3">Sign in with an admin account to open this page.</p></div>;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <h1 className="font-syne text-4xl font-extrabold leading-none tracking-tighter md:text-5xl">Admin dashboard</h1>
      <p className="mt-3 text-[15px] text-ink-muted">What needs your attention, and how the platform is doing.</p>
      {error && <p className="mt-6 font-semibold text-coral-dark">Could not load the numbers. Refresh to try again.</p>}

      <h2 className="label-caps mt-10">Needs review</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Stat label="Organizer requests waiting" value={s?.pendingOrganizers} href="/admin/organizers" flag={s?.pendingOrganizers > 0} />
        <Stat label="Events waiting for approval" value={s?.pendingEvents} href="/admin/review" flag={s?.pendingEvents > 0} />
      </div>

      <h2 className="label-caps mt-10">Platform</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Published events" value={s?.publishedEvents} href="/events" />
        <Stat label="Total events" value={s?.totalEvents} />
        <Stat label="Registrations" value={s?.registrations} />
        <Stat label="Organizers" value={s?.organizers} />
        <Stat label="Students" value={s?.students} />
        <Stat label="Active venues" value={s?.venues} href="/organizer/venues" />
      </div>
    </section>
  );
}
