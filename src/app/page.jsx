// Unit I & II: Server Component entry point for landing page (Static Site Generation with client interactivity)
import Landing from '@/components/Landing';

export const metadata = {
  title: 'Clyra | Campus events at LPU',
  description: 'Find, register for and organize campus events at Lovely Professional University.',
};

export default function HomePage() {
  return <Landing />;
}