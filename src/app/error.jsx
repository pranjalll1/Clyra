'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Unit I: Error and Loading UI - Next.js App Router Error Boundary
export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Log unexpected runtime error to console
    console.error('Application runtime error:', error);
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="border-2 border-onyx bg-surface p-8 shadow-tactile-lg">
        <span className="sticker -rotate-2 bg-coral text-surface">Error</span>
        <h1 className="mt-4 font-syne text-3xl font-extrabold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-ink-muted">
          {error?.message || 'An unexpected error occurred while rendering this page.'}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => reset()}
            className="btn-primary"
          >
            Try Again
          </button>
          <Link href="/" className="btn-secondary">
            Return Home
          </Link>
        </div>
      </div>
    </section>
  );
}
