import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Sign in: Clyra' };

export default function LoginPage({ searchParams }) {
  return (
    <section className="mx-auto max-w-lg px-4 py-12 md:py-16">
      <AuthForm initialTab={searchParams?.tab === 'register' ? 'register' : 'signin'} />
    </section>
  );
}
