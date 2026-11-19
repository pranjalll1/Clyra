import fs from 'node:fs';
import path from 'node:path';
import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Sign in | Clyra' };

// Shows public/images/auth-side.jpg (or .png/.webp) beside the form when you add one.
function sideImage() {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (fs.existsSync(path.join(process.cwd(), 'public', 'images', `auth-side.${ext}`))) return `/images/auth-side.${ext}`;
  }
  return null;
}

export default function LoginPage({ searchParams }) {
  const img = sideImage();
  return (
    <section className="mx-auto grid max-w-6xl items-stretch gap-8 px-4 py-12 md:py-16 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-lg">
        <AuthForm initialTab={searchParams?.tab === 'register' ? 'register' : 'signin'} />
      </div>
      <aside aria-hidden="true" className="relative hidden min-h-[420px] overflow-hidden border-[1.5px] border-onyx bg-onyx shadow-tactile-lg lg:block">
        {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-onyx/90 to-transparent p-8">
          <p className="sticker -rotate-2">Campus events</p>
          <p className="mt-4 font-syne text-4xl font-extrabold leading-[0.95] tracking-tighter text-surface">Find it. Register. Show up.</p>
        </div>
      </aside>
    </section>
  );
}
