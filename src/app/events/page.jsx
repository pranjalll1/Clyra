// Unit I: File-based Routing (/events)
// Unit II: Server Component wrapping Client Component with React Suspense boundary
import { Suspense } from 'react';
import EventsExplorer from '@/components/EventsExplorer';

export const metadata = {
  title: 'Campus events | Clyra',
  description: 'Search, filter, and discover upcoming college events and workshops at LPU.',
};

export default function EventsPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-7xl px-4 py-10 label-caps">Loading events...</p>}>
      <EventsExplorer />
    </Suspense>
  );
}