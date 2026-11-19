'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { kind, text }

  async function submit(e) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setMessage({ kind: 'ok', text: res.message });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not reach the server. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-t-[6px] border-t-coral p-6 shadow-tactile-lg md:p-8">
      <h1 className="font-syne text-3xl font-extrabold leading-none tracking-tighter md:text-4xl">Reset your password</h1>
      <p className="mt-3 text-[15px] text-ink-muted">Enter your college email. If an account exists, we send a link that works once for an hour.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="email" className="label-caps">College email</label>
          <input id="email" type="email" className="field mt-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yourname@lpu.in" autoComplete="email" required />
        </div>
        <div aria-live="polite">
          {message && (
            <p className={`border-[1.5px] border-onyx px-3 py-2 text-sm font-semibold ${message.kind === 'error' ? 'bg-coral-light text-coral-dark' : 'bg-lime-muted text-onyx'}`}>{message.text}</p>
          )}
        </div>
        <button type="submit" disabled={busy || !email} className="btn-coral w-full">{busy ? 'Please wait' : 'Send reset link'}</button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm font-semibold underline underline-offset-2">Back to sign in</Link>
    </div>
  );
}
