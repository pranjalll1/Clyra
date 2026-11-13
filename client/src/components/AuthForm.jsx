'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isStrongPassword } from '@/lib/passwordRules';
import PasswordChecklist from './PasswordChecklist';
import CaptchaBox, { CAPTCHA_ENABLED } from './CaptchaBox';

export default function AuthForm({ initialTab }) {
  const router = useRouter();
  const captchaRef = useRef(null);
  const [tab, setTab] = useState(initialTab);
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [token, setToken] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { kind: 'error' | 'ok', text }
  const [needsVerify, setNeedsVerify] = useState(false);
  const [busy, setBusy] = useState(false);

  const isRegister = tab === 'register';
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function switchTab(next) {
    setTab(next); setErrors({}); setMessage(null); setNeedsVerify(false);
  }

  async function submit(e) {
    e.preventDefault();
    setErrors({}); setMessage(null); setNeedsVerify(false);
    if (isRegister && !isStrongPassword(values.password)) {
      setErrors({ password: ['Meet every requirement listed below the field'] });
      return;
    }
    if (CAPTCHA_ENABLED && !token) {
      setMessage({ kind: 'error', text: 'Complete the verification check first.' });
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        const res = await api('/auth/register', { method: 'POST', body: { ...values, turnstileToken: token } });
        setMessage({ kind: 'ok', text: res.message });
        setNeedsVerify(true);
      } else {
        await api('/auth/login', { method: 'POST', body: { email: values.email, password: values.password, turnstileToken: token } });
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      if (!(err instanceof ApiError)) return setMessage({ kind: 'error', text: 'Could not reach the server. Try again.' });
      setErrors(err.fields);
      setMessage({ kind: 'error', text: err.message });
      if (err.code === 'EMAIL_NOT_VERIFIED') setNeedsVerify(true);
    } finally {
      setBusy(false);
      captchaRef.current?.reset(); // a Turnstile token can be used only once
      setToken('');
    }
  }

  async function resend() {
    try {
      const res = await api('/auth/resend-verification', { method: 'POST', body: { email: values.email } });
      setMessage({ kind: 'ok', text: res.message });
    } catch {
      setMessage({ kind: 'error', text: 'Could not send the link. Try again in a minute.' });
    }
  }

  const err = (k) => errors[k]?.[0];

  return (
    <div className="card border-t-[6px] border-t-coral p-6 shadow-tactile-lg md:p-8">
      <h1 className="font-syne text-3xl font-extrabold leading-none tracking-tighter md:text-4xl">
        {isRegister ? 'Create your account' : 'Sign in to Clyra'}
      </h1>
      <p className="mt-3 text-[15px] text-ink-muted">Use your college email (@lpu.in) to register for events and organize them.</p>

      <div role="tablist" aria-label="Sign in or create account" className="mt-6 grid grid-cols-2 border-[1.5px] border-onyx bg-surface-muted">
        {[['signin', 'Sign in'], ['register', 'Create account']].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => switchTab(id)} type="button"
            className={`px-3 py-3 font-mono text-xs font-bold uppercase tracking-wider ${tab === id ? 'bg-onyx text-lime' : 'text-onyx hover:bg-surface'}`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        {isRegister && (
          <div>
            <label htmlFor="name" className="label-caps">Full name</label>
            <input id="name" className={`field mt-2 ${err('name') ? 'field-error' : ''}`} value={values.name} onChange={set('name')}
              autoComplete="name" required aria-invalid={!!err('name')} aria-describedby={err('name') ? 'name-err' : undefined} />
            {err('name') && <p id="name-err" className="mt-1 text-sm font-semibold text-coral-dark">{err('name')}</p>}
          </div>
        )}
        <div>
          <label htmlFor="email" className="label-caps">College email</label>
          <input id="email" type="email" className={`field mt-2 ${err('email') ? 'field-error' : ''}`} value={values.email} onChange={set('email')}
            placeholder="yourname@lpu.in" autoComplete="email" required aria-invalid={!!err('email')} aria-describedby={err('email') ? 'email-err' : undefined} />
          {err('email') && <p id="email-err" className="mt-1 text-sm font-semibold text-coral-dark">{err('email')}</p>}
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label-caps">Password</label>
            {!isRegister && <Link href="/forgot-password" className="text-sm font-semibold underline underline-offset-2">Forgot password?</Link>}
          </div>
          <input id="password" type="password" className={`field mt-2 ${err('password') ? 'field-error' : ''}`} value={values.password} onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'} required
            aria-invalid={!!err('password')} aria-describedby={err('password') ? 'password-err' : undefined} />
          {err('password') && <p id="password-err" className="mt-1 text-sm font-semibold text-coral-dark">{err('password')}</p>}
          {isRegister && <PasswordChecklist password={values.password} />}
        </div>

        <CaptchaBox ref={captchaRef} onToken={setToken} />

        <div aria-live="polite">
          {message && (
            <p className={`border-[1.5px] border-onyx px-3 py-2 text-sm font-semibold ${message.kind === 'error' ? 'bg-coral-light text-coral-dark' : 'bg-lime-muted text-onyx'}`}>
              {message.text}
            </p>
          )}
          {needsVerify && (
            <button type="button" onClick={resend} className="mt-2 text-sm font-semibold underline underline-offset-2">Send a new verification link</button>
          )}
        </div>

        <button type="submit" disabled={busy} className="btn-coral w-full">
          {busy ? 'Please wait' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
