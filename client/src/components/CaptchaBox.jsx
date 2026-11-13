'use client';
import { forwardRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const CAPTCHA_ENABLED = !!SITE_KEY;

// Cloudflare Turnstile widget. Renders nothing when no site key is configured (local development).
// Parent keeps the ref so it can call ref.current?.reset() after each attempt (a token works once).
const CaptchaBox = forwardRef(function CaptchaBox({ onToken }, ref) {
  if (!SITE_KEY) return null;
  return (
    <Turnstile
      ref={ref}
      siteKey={SITE_KEY}
      options={{ theme: 'light' }}
      onSuccess={onToken}
      onExpire={() => onToken('')}
      onError={() => onToken('')}
    />
  );
});

export default CaptchaBox;
