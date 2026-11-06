import VerifyEmail from '@/components/VerifyEmail';

export const metadata = { title: 'Verify email: Clyra' };

export default function VerifyPage({ searchParams }) {
  return (
    <section className="mx-auto max-w-lg px-4 py-12 md:py-16">
      <VerifyEmail token={searchParams?.token || ''} />
    </section>
  );
}
