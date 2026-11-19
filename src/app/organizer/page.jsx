import RequireOrganizer from '@/components/RequireOrganizer';
import OrganizerDashboard from '@/components/OrganizerDashboard';

export const metadata = { title: 'Your events: Clyra' };

export default function Page() {
  return <RequireOrganizer><OrganizerDashboard /></RequireOrganizer>;
}
