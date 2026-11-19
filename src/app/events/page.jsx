import { Suspense } from 'react';
import EventsExplorer from '@/components/EventsExplorer';

export const metadata = { title: 'Campus events | Clyra' };

export default function EventsPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-7xl px-4 py-10 label-caps">Loading...</p>}>
      <EventsExplorer />
    </Suspense>
  );
}