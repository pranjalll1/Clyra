// Mirrors server/src/utils/password.js. The server is the real check; this gives live feedback.
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A number', test: (p) => /[0-9]/.test(p) },
  { label: 'A special character (! @ # $ ...)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isStrongPassword = (p) => p.length <= 72 && PASSWORD_RULES.every((r) => r.test(p));
