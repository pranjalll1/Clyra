import RequireOrganizer from '@/components/RequireOrganizer';
import EventForm from '@/components/EventForm';

export const metadata = { title: 'New event: Clyra' };

export default function Page() {
  return <RequireOrganizer><EventForm /></RequireOrganizer>;
}
