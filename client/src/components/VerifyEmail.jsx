'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export default function VerifyEmail({ token }) {
  const [state, setState] = useState({ status: token ? 'working' : 'error', text: token ? '' : 'This link is missing its token. Open the link from your email again.' });
  const ran = useRef(false); // React strict mode runs effects twice in dev; the token works once.

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then((r) => setState({ status: 'ok', text: r.message }))
      .catch((e) => setState({ status: 'error', text: e.message }));
  }, [token]);

  return (
    <div className="card border-t-[6px] border-t-lime p-6 shadow-tactile-lg md:p-8" aria-live="polite">
      <h1 className="font-syne text-3xl font-extrabold leading-none tracking-tighter">
        {state.status === 'ok' ? 'Email verified' : state.status === 'working' ? 'Verifying your email' : 'Could not verify'}
      </h1>
      {state.text && <p className="mt-4 text-[15px]">{state.text}</p>}
      {state.status === 'ok' && <Link href="/login" className="btn-primary mt-6">Sign in</Link>}
      {state.status === 'error' && <Link href="/login" className="btn-ghost mt-6">Back to sign in</Link>}
    </div>
  );
}
