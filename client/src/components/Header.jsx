'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/useMe';
import ConfirmDialog from './ConfirmDialog';

const linkCls = 'font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4';

export default function Header() {
  const { user, loading, refresh } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // The header lives in the layout and never remounts, so re-check who is signed in after every navigation.
  useEffect(() => { refresh(); }, [pathname, refresh]);

  async function signOut() {
    setSigningOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      setSigningOut(false);
      setConfirmOut(false);
      alert('Could not reach the server. Check that the app is running, then try again.');
      return;
    }
    await refresh();
    setSigningOut(false);
    setConfirmOut(false);
    router.push('/');
    router.refresh();
  }

  const isStaff = user && ['organizer', 'admin'].includes(user.role);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-onyx bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-syne text-2xl font-extrabold tracking-tight">CLYRA</Link>
          <span className="border border-onyx bg-surface-muted px-2 py-1 font-mono text-xs font-semibold uppercase tracking-wider">LPU</span>
        </div>
        <nav aria-label="Account" className="flex flex-wrap items-center gap-3">
          <Link href="/events" className={linkCls}>Events</Link>
          {loading ? null : user ? (
            <>
              {user.role === 'student' && <Link href="/my-bookings" className={linkCls}>My bookings</Link>}
              {isStaff && <Link href="/organizer" className={linkCls}>Your events</Link>}
              {isStaff && <Link href="/organizer/venues" className={linkCls}>Venues</Link>}
              {user.role === 'admin' && <Link href="/admin/review" className={linkCls}>Review events</Link>}
              <span className="hidden font-mono text-xs uppercase tracking-wider text-ink-muted sm:inline">{user.name} &middot; {user.role}</span>
              <button onClick={() => setConfirmOut(true)} className="btn-ghost">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <Link href="/login?tab=register" className="btn-primary">Create account</Link>
            </>
          )}
        </nav>
      </div>

      <ConfirmDialog
        open={confirmOut}
        title="Sign out?"
        message="You will need to sign in again to see your bookings or manage events."
        confirmLabel="Sign out"
        busy={signingOut}
        onConfirm={signOut}
        onClose={() => setConfirmOut(false)}
      />
    </header>
  );
}
