// Unit I: Nested Routes & Layouts - Shared layout for all /admin/* pages
import Link from 'next/link';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b-2 border-onyx bg-surface-muted px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
              Admin Portal
            </span>
            <div className="hidden sm:flex gap-3 text-sm font-semibold">
              <Link href="/admin" className="hover:underline">
                Overview
              </Link>
              <span className="text-ink-muted">/</span>
              <Link href="/admin/review" className="hover:underline">
                Review Events
              </Link>
              <span className="text-ink-muted">/</span>
              <Link href="/admin/organizers" className="hover:underline">
                Organizer Requests
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
