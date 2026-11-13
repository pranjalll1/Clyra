import { z } from 'zod';

// Shared by sign-up, password reset and (later) change-password. Login is NOT checked, so older accounts still work.
export const strongPassword = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters') // bcrypt ignores everything after 72 bytes
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[0-9]/, 'Add a number')
  .regex(/[^A-Za-z0-9]/, 'Add a special character, for example ! @ # $');
