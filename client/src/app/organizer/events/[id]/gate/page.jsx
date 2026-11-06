import RequireOrganizer from '@/components/RequireOrganizer';
import GateConsole from '@/components/GateConsole';

export const metadata = { title: 'Gate check-in | Clyra' };

export default function GatePage() {
  return (
    <RequireOrganizer>
      <GateConsole />
    </RequireOrganizer>
  );
}