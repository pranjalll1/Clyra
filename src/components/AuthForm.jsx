'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isStrongPassword } from '@/lib/passwordRules';
import PasswordChecklist from './PasswordChecklist';

export default function AuthForm({ initialTab }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [accountType, setAccountType] = useState('student');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { kind: 'error' | 'ok', text }
  const [busy, setBusy] = useState(false);

  const isRegister = tab === 'register';
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function switchTab(next) {
    setTab(next); setErrors({}); setMessage(null);
  }

  async function submit(e) {
    e.preventDefault();
    setErrors({}); setMessage(null);
    if (isRegister && !isStrongPassword(values.password)) {
      setErrors({ password: ['Meet every requirement listed below the field'] });
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        const res = await api('/auth/register', { method: 'POST', body: { ...values, accountType } });
        // The account is active and signed in already. Organizers go straight to their request form.
        router.push(res.user.requestedRole === 'organizer' ? '/become-organizer' : '/');
        router.refresh();
      } else {
        const res = await api('/auth/login', { method: 'POST', body: { email: values.email, password: values.password } });
        // Someone who signed up as an organizer but is not approved yet goes straight to their request.
        router.push(res.user.role === 'student' && res.user.requestedRole === 'organizer' ? '/become-organizer' : '/');
        router.refresh();
      }
    } catch (err) {
      if (!(err instanceof ApiError)) return setMessage({ kind: 'error', text: 'Could not reach the server. Try again.' });
      setErrors(err.fields);
      setMessage({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
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
          <fieldset>
            <legend className="label-caps">I am signing up as</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[['student', 'Student', 'Browse events, register and get tickets.'], ['organizer', 'Organizer', 'Create and manage events. An admin approves you first.']].map(([id, title, text]) => (
                <label key={id} className={`flex cursor-pointer gap-3 border border-onyx p-3 ${accountType === id ? 'bg-lime' : 'bg-surface hover:bg-lime-muted'}`}>
                  <input type="radio" name="accountType" value={id} checked={accountType === id} onChange={() => setAccountType(id)} className="mt-1 h-4 w-4 accent-onyx" />
                  <span><span className="block font-syne text-base font-bold">{title}</span><span className="block text-sm">{text}</span></span>
                </label>
              ))}
            </div>
            {accountType === 'organizer' && (
              <p className="mt-2 text-sm text-ink-muted">Right after you create your account, you submit your organization details. You can use Clyra as a student while you wait for approval.</p>
            )}
          </fieldset>
        )}
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
            {!isRegister && process.env.NEXT_PUBLIC_PASSWORD_RESET === 'true' && <Link href="/forgot-password" className="text-sm font-semibold underline underline-offset-2">Forgot password?</Link>}
          </div>
          <input id="password" type="password" className={`field mt-2 ${err('password') ? 'field-error' : ''}`} value={values.password} onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'} required
            aria-invalid={!!err('password')} aria-describedby={err('password') ? 'password-err' : undefined} />
          {err('password') && <p id="password-err" className="mt-1 text-sm font-semibold text-coral-dark">{err('password')}</p>}
          {isRegister && <PasswordChecklist password={values.password} />}
        </div>

        <div aria-live="polite">
          {message && (
            <p className={`border-[1.5px] border-onyx px-3 py-2 text-sm font-semibold ${message.kind === 'error' ? 'bg-coral-light text-coral-dark' : 'bg-lime-muted text-onyx'}`}>
              {message.text}
            </p>
          )}
        </div>

        <button type="submit" disabled={busy} className="btn-coral w-full">
          {busy ? 'Please wait' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
