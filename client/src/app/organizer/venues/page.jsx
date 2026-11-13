import RequireOrganizer from '@/components/RequireOrganizer';
import VenueAvailability from '@/components/VenueAvailability';

export const metadata = { title: 'Venue availability | Clyra' };

export default function VenuesPage() {
  return (
    <RequireOrganizer>
      <VenueAvailability />
    </RequireOrganizer>
  );
}