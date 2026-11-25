import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Sign in | Clyra' };

export default function LoginPage({ searchParams }) {
  return (
    <section className="mx-auto grid max-w-6xl items-stretch gap-8 px-4 py-12 md:py-16 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-lg">
        <AuthForm initialTab={searchParams?.tab === 'register' ? 'register' : 'signin'} />
      </div>
      <aside
        aria-labelledby="login-promo-heading"
        className="mx-auto flex w-full max-w-lg items-center justify-center overflow-hidden border-[1.5px] border-onyx bg-black p-4 shadow-tactile-lg md:p-6 lg:max-w-none"
      >
        <h2 id="login-promo-heading" className="sr-only">
          Campus 001: The Student Experience. Don&apos;t just attend. Belong. Discover, Connect, Experience.
        </h2>
        <img
          src="/images/clyra-login-hero.png"
          alt="CLYRA poster: Campus 001, The Student Experience — Don't just attend. Belong. Discover, Connect, Experience."
          className="h-auto max-h-[540px] w-full object-contain"
        />
      </aside>
    </section>
  );
}
