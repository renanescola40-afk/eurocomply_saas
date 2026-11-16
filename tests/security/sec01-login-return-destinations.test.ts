import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isAllowedLoginReturnDestination } from '@/lib/auth/login-return-destinations';

describe('SEC-01 post-login profile return allowlist', () => {
  it.each(['en', 'pt', 'es', 'fr', 'it', 'de'])(
    'retains the private /%s/profile return requested by the server',
    (locale) => {
      expect(isAllowedLoginReturnDestination(`/${locale}/profile`, locale)).toBe(true);
      expect(isAllowedLoginReturnDestination(`/${locale}/profile?tab=privacy`, locale)).toBe(true);
    },
  );

  it('preserves the existing onboarding, dashboard and checkout destinations', () => {
    for (const path of [
      '/en/onboarding',
      '/en/dashboard/organizations',
      '/en/dashboard/observability',
      '/en/checkout?plan=business',
    ]) expect(isAllowedLoginReturnDestination(path, 'en')).toBe(true);
  });

  it.each([
    '//evil.example/path',
    'https://evil.example',
    '/fr/profile',
    '/en/profiles',
    '/en/profile-evil',
    '/en/admin/sales/leads',
    '/en/login',
  ])('does not add a new unsafe/unrelated return target: %s', (path) => {
    expect(isAllowedLoginReturnDestination(path, 'en')).toBe(false);
  });

  it('keeps client login calling the allowlist after existing external-URL guards', () => {
    const page = readFileSync('src/app/[locale]/login/page.tsx', 'utf8');
    expect(page).toContain('function safeNext(');
    expect(page).toContain("value.startsWith('//')");
    expect(page).toContain("value.includes('://')");
    expect(page).toContain('return isAllowedLoginReturnDestination(value, locale) ? value : fallback;');
    expect(page).toContain('router.replace(afterSignInUrl)');
  });
});
