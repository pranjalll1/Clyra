'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';

export default function Header() {
  const { user, loading, refresh } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  // The header lives in the layout and never remounts, so re-check who is signed in after every navigation.
  useEffect(() => { refresh(); }, [pathname, refresh]);

  async function signOut() {
    await api('/auth/logout', { method: 'POST' });
    await refresh();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b-2 border-onyx bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-syne text-2xl font-extrabold tracking-tight">CLYRA</Link>
          <span className="border border-onyx bg-surface-muted px-2 py-1 font-mono text-xs font-semibold uppercase tracking-wider">LPU</span>
        </div>
        <nav aria-label="Account" className="flex items-center gap-3">          <Link href="/events" className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">Events</Link>
          {loading ? null : user ? (
            <>              {user.role === 'student' && <Link href="/my-bookings" className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">My bookings</Link>}
              {['organizer', 'admin'].includes(user.role) && <Link href="/organizer" className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">Your events</Link>}
              <span className="hidden font-mono text-xs uppercase tracking-wider text-ink-muted sm:inline">{user.name} &middot; {user.role}</span>
              <button onClick={signOut} className="btn-ghost">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <Link href="/login?tab=register" className="btn-primary">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
