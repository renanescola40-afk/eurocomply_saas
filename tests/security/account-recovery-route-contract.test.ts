import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/auth/recovery/route.ts', 'utf8');
const recoveryPage = readFileSync('src/app/[locale]/recuperar-senha/page.tsx', 'utf8');
const resetPage = readFileSync('src/app/[locale]/reset-password/page.tsx', 'utf8');
const login = readFileSync('src/app/[locale]/login/page.tsx', 'utf8');
const middleware = readFileSync('src/middleware.ts', 'utf8');
const enterpriseScanner = readFileSync('scripts/security/check-enterprise-api-security.mjs', 'utf8');
const endpointScanner = readFileSync('scripts/security/check-api-endpoint-hardening.mjs', 'utf8');
const routeScanner = readFileSync('scripts/security/check-api-route-hardening.mjs', 'utf8');

function expectAll(source: string, tokens: string[]) {
  for (const token of tokens) expect(source).toContain(token);
}

describe('public account recovery contract', () => {
  it('keeps the recovery request bounded, same-origin, no-store and fail closed', () => {
    expectAll(route, [
      'assertTrustedOrigin(request)',
      'readBoundedJsonRequest<unknown>',
      'RECOVERY_BODY_MAX_BYTES',
      'requireJsonContentType: true',
      "policy: 'password-reset'",
      "failureMode: 'fail-closed'",
      'privacySafeRecoveryKey(email)',
      'noStoreJson',
      'resetPasswordForEmail(email, { redirectTo })',
      'new URL(`/${locale}/reset-password`, request.nextUrl.origin)',
    ]);
  });

  it('does not expose account existence or raw provider details', () => {
    expect(route).toContain('If an account exists for that email, a secure recovery link will be sent.');
    expect(route).not.toContain('userExists');
    expect(route).not.toContain('account_not_found');
    expect(route).not.toContain('email_not_found');
    expect(route).not.toContain('error.message');
    expect(route).not.toContain('emailAddress: email');
  });

  it('requires a recovery session and confirmation before updating a password', () => {
    expectAll(resetPage, [
      "event === 'PASSWORD_RECOVERY'",
      "state !== 'ready'",
      'password.length < 8',
      'password !== confirmation',
      'supabase.auth.updateUser({ password })',
      'await supabase.auth.signOut()',
    ]);
    expect(resetPage).not.toContain('localStorage');
    expect(resetPage).not.toContain('sessionStorage');
    expect(resetPage).not.toContain('document.cookie');
  });

  it('exposes localized, actionable request and completion routes', () => {
    expect(recoveryPage).toContain("fetch('/api/auth/recovery'");
    expect(login).toContain('href={`/${locale}/recuperar-senha`}');
    expect(middleware).toContain("'/recuperar-senha'");
    expect(middleware).toContain("'/reset-password'");

    for (const locale of ['en', 'pt', 'es', 'fr', 'it', 'de']) {
      expect(recoveryPage).toContain(`${locale}: {`);
      expect(resetPage).toContain(`${locale}: {`);
    }
  });

  it('uses narrow scanner exceptions backed by dedicated stronger contracts', () => {
    expectAll(enterpriseScanner, [
      'const publicAccountRecoveryRoutes',
      '/src\\/app\\/api\\/auth\\/recovery\\/route\\.ts$/',
      'function evaluatePublicAccountRecoveryContract',
      "policy: 'password-reset'",
      "failureMode: 'fail-closed'",
      'privacySafeRecoveryKey(email)',
      'GENERIC_RECOVERY_MESSAGE',
      'resetPasswordForEmail(email, { redirectTo })',
    ]);
    expect(enterpriseScanner).toContain('...publicAccountRecoveryRoutes');

    expect(endpointScanner).toMatch(/appApiPrefixPattern[^\n]+auth[^\n]+recovery[^\n]+route/);
    expect(endpointScanner).toContain(
      'enumeration-resistant, bounded, same-origin, no-store and fail-closed rate-limited',
    );

    expectAll(routeScanner, [
      'const PUBLIC_ACCOUNT_RECOVERY_PATTERN',
      'function checkAccountRecoveryMutation',
      "policy: 'password-reset'",
      "failureMode: 'fail-closed'",
      'privacySafeRecoveryKey(email)',
      'account recovery is missing trusted Origin validation',
    ]);
    expect(routeScanner).toContain('checkLeadMutation(source, failures)');
    expect(routeScanner).toContain('checkAccountRecoveryMutation(source, failures)');
  });
});
