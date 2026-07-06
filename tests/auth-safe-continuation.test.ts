import { describe, expect, it } from 'vitest';

import {
  getSafeLocalizedAuthContinuation,
  isSafeLocalizedAuthContinuation,
  normalizeContinuationLocale,
} from '@/lib/auth/safe-continuation';

describe('safe auth continuation helper', () => {
  it('accepts only expected localized auth destinations', () => {
    expect(isSafeLocalizedAuthContinuation('/pt/onboarding', 'pt')).toBe(true);
    expect(isSafeLocalizedAuthContinuation('/pt/onboarding?plan=growth', 'pt')).toBe(true);
    expect(isSafeLocalizedAuthContinuation('/pt/checkout?plan=starter', 'pt')).toBe(true);
    expect(isSafeLocalizedAuthContinuation('/pt/dashboard/organizations', 'pt')).toBe(true);
    expect(isSafeLocalizedAuthContinuation('/pt/dashboard/observability', 'pt')).toBe(true);
  });

  it('rejects unsafe and unrelated localized paths', () => {
    expect(isSafeLocalizedAuthContinuation('//blocked.example/path', 'pt')).toBe(false);
    expect(isSafeLocalizedAuthContinuation('/pt/admin', 'pt')).toBe(false);
    expect(isSafeLocalizedAuthContinuation('/pt/api/auth/callback', 'pt')).toBe(false);
    expect(isSafeLocalizedAuthContinuation('/en/onboarding', 'pt')).toBe(false);
  });

  it('falls back to localized onboarding for unsafe paths', () => {
    expect(getSafeLocalizedAuthContinuation('//blocked.example/path', 'pt')).toBe('/pt/onboarding');
    expect(getSafeLocalizedAuthContinuation('/pt/admin', 'pt')).toBe('/pt/onboarding');
    expect(getSafeLocalizedAuthContinuation('/en/onboarding', 'en')).toBe('/en/onboarding');
  });

  it('normalizes invalid locales safely', () => {
    expect(normalizeContinuationLocale('pt')).toBe('pt');
    expect(normalizeContinuationLocale('en')).toBe('en');
    expect(normalizeContinuationLocale('invalid')).toBe('pt');
  });
});
