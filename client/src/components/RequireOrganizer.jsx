'use client';
import Link from 'next/link';
import { useMe } from '@/lib/useMe';

// Renders children only for organizers and admins; students and signed-out visitors get a clear message.
export default function RequireOrganizer({ children }) {
  const { user, loading } = useMe();
  if (loading) return <p className="px-6 py-12 font-mono text-sm">Loading</p>;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="mb-4 text-lg">Sign in with an organizer account to manage events.</p>
        <Link href="/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }
  if (!['organizer', 'admin'].includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-syne text-3xl font-extrabold tracking-tighter">Organizer access needed</h1>
        <p className="mt-3">Your account is a student account. Organizer access is granted by an admin.</p>
      </div>
    );
  }
  return children;
}
