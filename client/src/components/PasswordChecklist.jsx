import { PASSWORD_RULES } from '@/lib/passwordRules';

export default function PasswordChecklist({ password }) {
  return (
    <ul aria-label="Password requirements" className="mt-2 space-y-1 text-sm">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className={ok ? 'font-semibold text-onyx' : 'text-ink-muted'}>
            <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.label}
            <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
