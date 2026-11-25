// Unit I: Dynamic Route (/events/[slug]) - Extracts slug param for event details
// Unit II: Server Component entry point delegating interactive booking to client component
import EventDetail from '@/components/EventDetail';

export const metadata = {
  title: 'Event Details | Clyra',
  description: 'View full event agenda, schedule, ticket status, and venue information.',
};

export default function EventPage() {
  return <EventDetail />;
}