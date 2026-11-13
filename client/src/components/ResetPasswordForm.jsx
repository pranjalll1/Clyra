'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { isStrongPassword } from '@/lib/passwordRules';
import PasswordChecklist from './PasswordChecklist';

export default function ResetPasswordForm({ token }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(password)) return setError('Meet every requirement listed below the field.');
    setBusy(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.fields?.password?.[0] || err.message : 'Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="card p-6 shadow-tactile-lg">
        <h1 className="font-syne text-3xl font-extrabold tracking-tighter">This link is incomplete</h1>
        <p className="mt-3">Open the link from your email again, or ask for a new one.</p>
        <Link href="/forgot-password" className="btn-ghost mt-6">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="card border-t-[6px] border-t-lime p-6 shadow-tactile-lg md:p-8">
      <h1 className="font-syne text-3xl font-extrabold leading-none tracking-tighter md:text-4xl">{done ? 'Password updated' : 'Choose a new password'}</h1>
      {done ? (
        <>
          <p className="mt-4">Your password was changed. Sign in with the new one.</p>
          <Link href="/login" className="btn-primary mt-6">Sign in</Link>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-5">
          <div>
            <label htmlFor="password" className="label-caps">New password</label>
            <input id="password" type="password" className="field mt-2" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            <PasswordChecklist password={password} />
          </div>
          <div aria-live="polite">{error && <p className="border-[1.5px] border-onyx bg-coral-light px-3 py-2 text-sm font-semibold text-coral-dark">{error}</p>}</div>
          {error.includes('invalid or has expired') && <Link href="/forgot-password" className="text-sm font-semibold underline underline-offset-2">Request a new link</Link>}
          <button type="submit" disabled={busy} className="btn-coral w-full">{busy ? 'Please wait' : 'Update password'}</button>
        </form>
      )}
    </div>
  );
}
