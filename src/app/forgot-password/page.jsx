import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export const metadata = { title: 'Reset password | Clyra' };

export default function Page() {
  return (
    <section className="mx-auto max-w-lg px-4 py-12 md:py-16">
      <ForgotPasswordForm />
    </section>
  );
}
