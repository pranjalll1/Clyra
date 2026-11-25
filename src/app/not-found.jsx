import Link from 'next/link';

// Unit I: File-based routing & Error UI (Custom 404 page)
export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="border-2 border-onyx bg-surface p-8 shadow-tactile-lg">
        <span className="sticker rotate-2 bg-yellow text-onyx">404</span>
        <h1 className="mt-4 font-syne text-4xl font-extrabold tracking-tight">
          Page Not Found
        </h1>
        <p className="mt-3 text-ink-muted">
          The page or event you are looking for does not exist or may have been moved.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/events" className="btn-primary">
            Explore Events
          </Link>
          <Link href="/" className="btn-secondary">
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
