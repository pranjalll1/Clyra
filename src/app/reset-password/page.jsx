import ResetPasswordForm from '@/components/ResetPasswordForm';

export const metadata = { title: 'Choose a new password | Clyra' };

export default function Page({ searchParams }) {
  return (
    <section className="mx-auto max-w-lg px-4 py-12 md:py-16">
      <ResetPasswordForm token={searchParams?.token || ''} />
    </section>
  );
}
