import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Offline source contract only. The official SEC-01 QA runtime and acceptance
// remain separate and require authenticated exact-SHA provider/browser evidence.
const login = readFileSync('src/app/[locale]/login/page.tsx', 'utf8');
const runner = readFileSync('scripts/enterprise-gates/a01-sec01-next-app-qa-browser-proof.mjs', 'utf8');

describe('SEC-01 QA browser: invalid-password denial', () => {
  it('recovers from rejected auth calls with a generic visible error and an unlocked form', () => {
    const handler = login.split('async function handleSubmit(')[1]?.split('  const inputClass =')[0];
    expect(handler).toBeTruthy();
    expect(handler).toMatch(/try\s*\{[\s\S]*?await signInWithEmail\(/);
    expect(handler).toMatch(/if \(result\.error\)\s*\{\s*setError\(text\.failed\)/);
    expect(handler).toMatch(/catch\s*\{[\s\S]*?setError\(text\.failed\)/);
    expect(handler).toMatch(/finally\s*\{\s*setBusy\(false\);\s*\}/);
    expect(handler).toContain('router.replace(afterSignInUrl)');
    expect(handler).not.toMatch(/console\.(log|warn|error)/);
  });

  it('requires a real provider invalid-credentials response and visible browser denial', () => {
    const negative = runner.split("stage = 'bad_password_denied_in_real_browser';")[1]
      ?.split("stage = 'real_browser_password_login';")[0];
    expect(negative).toBeTruthy();
    expect(negative).toContain('page.waitForResponse(');
    expect(negative).toContain("url.origin === QA_URL && url.pathname === '/auth/v1/token'");
    expect(negative).toContain("request.method() === 'POST'");
    expect(negative).toContain("url.searchParams.get('grant_type') === 'password'");
    expect(negative).toContain("page.on('requestfailed', observeRequestFailure)");
    expect(negative).toContain("page.off('requestfailed', observeRequestFailure)");
    expect(negative).toContain("'invalid_password_request_not_sent'");
    expect(negative).toContain("'invalid_password_request_failed'");
    expect(negative).toContain("denialCode === 'invalid_credentials'");
    expect(negative).toContain("getByRole('alert').waitFor");
    expect(negative).toContain('invalidPasswordCookies.length === 0');
    expect(negative).toContain('isLoginPath(page.url())');
  });

  it('retains fail-closed QA-only evidence and fixed non-sensitive failure detail', () => {
    expect(runner).toContain("SEC01_APP_EXECUTE === 'QA_ONLY_APP_BROWSER_PROOF'");
    expect(runner).toContain("SEC01_QA_PROJECT_REF === QA_REF");
    expect(runner).toContain("process.env.VERCEL_ENV !== 'production'");
    expect(runner).toContain("failure_detail: failedStage ? failureDetail : null");
    expect(runner).toContain("gate: 'NOT_ACCEPTED'");
    expect(runner).toContain("control: 'NOT_VERIFIED'");
    expect(runner).not.toMatch(/console\.log\(password\)|console\.log\(email\)/);
    expect(runner).toContain("qa_cleanup_verified: cleaned");
  });

  it('scopes both browser login attempts to the password form, not the separate SSO form', () => {
    const sso = readFileSync('src/components/auth/enterprise-sso-login.tsx', 'utf8');
    expect(login).toContain('<EnterpriseSsoLogin');
    expect(login).toContain('onSubmit={handleSubmit}');
    expect(login).toContain('type="password"');
    expect(sso).toContain('onSubmit={startSso}');
    expect(sso).toContain('type="email"');
    // Two forms each contain email + submit; the old generic locator is ambiguous.
    expect(runner).toContain('const passwordForm = page.locator(\'form:has(input[type="password"])\');');
    expect(runner).toContain('passwordForm.locator(\'input[type="email"]\').fill(email)');
    expect(runner).toContain('passwordForm.locator(\'input[type="password"]\').fill(password + \'wrong\')');
    expect(runner).toContain('passwordForm.locator(\'input[type="password"]\').fill(password)');
    expect(runner.match(/passwordForm\.locator\(/g)).toHaveLength(5);
    expect(runner).not.toContain("page.locator('form input[type=");
    expect(runner).not.toContain("page.locator('form button[type=");
    expect(runner).toContain("failureDetail = 'password_form_email_input_unavailable'");
    expect(runner).toContain("failureDetail = 'password_form_password_input_unavailable'");
    expect(runner).toContain("failureDetail = 'valid_password_input_unavailable'");
    expect(runner).toContain("failureDetail = 'valid_password_submit_unavailable'");
  });
});
