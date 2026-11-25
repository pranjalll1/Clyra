// Unit I: Nested Routes & Layouts - Shared layout for all /organizer/* pages
import Link from 'next/link';

export default function OrganizerLayout({ children }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b-2 border-onyx bg-surface-muted px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
              Organizer Portal
            </span>
            <div className="hidden sm:flex gap-3 text-sm font-semibold">
              <Link href="/organizer" className="hover:underline">
                Dashboard
              </Link>
              <span className="text-ink-muted">/</span>
              <Link href="/organizer/events/new" className="hover:underline">
                New Event
              </Link>
              <span className="text-ink-muted">/</span>
              <Link href="/organizer/venues" className="hover:underline">
                Venues
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
