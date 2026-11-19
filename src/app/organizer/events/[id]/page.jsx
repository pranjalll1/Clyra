import RequireOrganizer from '@/components/RequireOrganizer';
import EventForm from '@/components/EventForm';

export const metadata = { title: 'Edit event: Clyra' };

export default function Page({ params }) {
  return <RequireOrganizer><EventForm eventId={params.id} /></RequireOrganizer>;
}
