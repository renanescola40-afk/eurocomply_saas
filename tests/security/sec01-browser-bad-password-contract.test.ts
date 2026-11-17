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

  it('does not block password login on pending initial session hydration', () => {
    // A stalled getSession() snapshot cannot disable an otherwise valid
    // credential submit; server-side Supabase authentication remains decisive.
    const handler = login.split('async function handleSubmit(')[1]?.split('  const inputClass =')[0];
    const passwordForm = login.split('<form className="space-y-4" onSubmit={handleSubmit} data-auth-hydrated={formHydrated ? "true" : "false"}>')[1]
      ?.split('</form>')[0];
    expect(handler).toBeTruthy();
    expect(handler).not.toMatch(/if \(loading\)\s*\{/);
    expect(handler).toContain('await signInWithEmail(email.trim().toLowerCase(), secret)');
    expect(passwordForm).toContain('<button type="submit" disabled={busy}');
    expect(passwordForm).not.toContain('disabled={busy || loading}');
    expect(login).toContain('disabled={busy || loading}'); // SSO/OAuth gate unaffected.
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
    expect(negative).toContain("page.getByRole('alert').filter({ hasText: genericDenialText })");
    expect(negative).toContain("await passwordDenial.waitFor({ state: 'visible', timeout: 30000 })");
    expect(negative).toContain('denialVisible = await passwordDenial.count() === 1');
    expect(negative).toContain("genericDenialText = 'Could not sign in. Check your details and try again.'");
    expect(negative).toContain("failureDetail = 'invalid_password_ui_auth_pending'");
    expect(negative).toContain("'invalid_password_ui_alert_text_mismatch'");
    expect(negative).toContain("'invalid_password_ui_alert_ambiguous'");
    expect(negative).toContain("throw new Error('invalid_password_ui_proof_missing')");
    expect(negative).not.toContain("await page.getByRole('alert').waitFor");
    expect(negative).not.toContain('force: true');
    const copy = readFileSync('src/lib/i18n/commercial-surface-copy.ts', 'utf8');
    expect(copy).toContain("failed: 'Could not sign in. Check your details and try again.'");
    const verifier = readFileSync('scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs', 'utf8');
    for (const suffix of ['unexpected_navigation','form_missing','auth_pending','alert_ambiguous','alert_hidden','alert_text_mismatch','alert_absent']) {
      expect(verifier).toContain("'invalid_password_ui_" + suffix + "'");
    }
    expect(negative).toContain('invalidPasswordCookies.length === 0');
    expect(negative).toContain('isLoginPath(page.url())');
  });

  it('handles the real privacy banner before clicking the password submit button', () => {
    const banner = readFileSync('src/components/analytics/AnalyticsConsentBanner.tsx', 'utf8');
    const consent = runner.split("failureDetail = 'analytics_consent_decline_unavailable';")[1]
      ?.split("failureDetail = 'password_form_email_input_unavailable';")[0];
    const negative = runner.split("stage = 'bad_password_denied_in_real_browser';")[1]
      ?.split("stage = 'real_browser_password_login';")[0];
    expect(banner).toContain('fixed inset-x-4 bottom-4 z-50');
    expect(banner).toContain('setVisible(existingConsent');
    expect(banner).toContain('denyAnalyticsConsent()');
    expect(banner).toContain('aria-labelledby={CONSENT_TITLE_ID}');
    expect(consent).toBeTruthy();
    expect(consent).toContain("page.getByRole('dialog'");
    expect(consent).toContain("name: 'Privacy-first product analytics'");
    expect(consent).toContain("getByRole('button', { name: 'Decline', exact: true })");
    expect(consent).toContain("waitFor({ state: 'hidden'");
    expect(consent).toContain("window.localStorage.getItem('risckcomply.analytics.consent') === 'denied'");
    expect(negative?.indexOf("getByRole('button', { name: 'Decline'")).toBeLessThan(
      negative?.indexOf("invalidSubmit.click({ noWaitAfter: true })") ?? -1,
    );
    // No synthetic consent pre-seeding, forced click or hidden overlay.
    expect(consent).not.toContain('localStorage.setItem');
    expect(consent).not.toContain('force: true');
    expect(consent).not.toContain('.dispatchEvent(');
    expect(consent).not.toContain('.route(');
    const verifier = readFileSync('scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs', 'utf8');
    expect(verifier).toContain("'analytics_consent_decline_unavailable'");
    expect(verifier).toContain("'analytics_consent_not_denied'");
  });

  it('waits for a genuinely hydrated React password form before QA credential input', () => {
    expect(login).toContain('useEffect(() => { setFormHydrated(true); }, [])');
    expect(login).toContain('data-auth-hydrated={formHydrated ? "true" : "false"}');
    expect(login).toContain('const [formHydrated, setFormHydrated] = useState(false)');
    const beforeFill = runner.split("stage = 'bad_password_denied_in_real_browser';")[1]
      ?.split("failureDetail = 'password_form_email_input_unavailable';")[0];
    expect(beforeFill).toBeTruthy();
    expect(beforeFill).toContain("failureDetail = 'password_form_hydration_unavailable'");
    expect(beforeFill).toContain('await page.waitForFunction(');
    expect(beforeFill).toContain('form[data-auth-hydrated="true"] input[type="password"]');
    expect(beforeFill).not.toContain("page.route(");
    const verifier = readFileSync('scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs', 'utf8');
    expect(verifier).toContain("'password_form_hydration_unavailable'");
  });

  it('uses real pointer actions without implicit navigation waiting, and separately checks actual provider responses', () => {
    const badPassword = runner.split("stage = 'bad_password_denied_in_real_browser';")[1]
      ?.split("stage = 'real_browser_password_login';")[0];
    const validPassword = runner.split("stage = 'real_browser_password_login';")[1]
      ?.split("stage = 'authenticated_private_profile_available';")[0];
    expect(badPassword).toBeTruthy();
    expect(validPassword).toBeTruthy();
    // Pointer clicks remain subject to Playwright actionability checks; only
    // its implicit navigation wait is disabled. Never use force or DOM dispatch.
    expect(badPassword).toContain('await invalidSubmit.click({ noWaitAfter: true });');
    expect(validPassword).toContain('await validSubmit.click({ noWaitAfter: true });');
    expect(badPassword).not.toContain('force: true');
    expect(validPassword).not.toContain('force: true');
    expect(runner).not.toContain('.dispatchEvent(');
    expect(badPassword).toContain("classifyRealSubmitFailure(invalidSubmit, 'invalid_password')");
    expect(validPassword).toContain("classifyRealSubmitFailure(validSubmit, 'valid_password')");
    expect(runner).toContain('async function classifyRealSubmitFailure(button, prefix)');
    expect(runner).toContain('node.ownerDocument.elementFromPoint(');
    const verifier = readFileSync('scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs', 'utf8');
    for (const prefix of ['invalid_password', 'valid_password']) {
      for (const suffix of ['missing_or_ambiguous', 'hidden', 'disabled', 'obscured', 'action_failed']) {
        expect(verifier).toContain(prefix + '_submit_' + suffix);
      }
    }
    expect(badPassword).toContain('page.waitForResponse(');
    expect(badPassword).toContain("denialCode === 'invalid_credentials'");
    expect(validPassword).toContain("() => window.location.pathname !== '/en/login'");
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
    // Five original credential/submit actions plus one read-only disabled
    // state check for sanitized post-denial diagnostics.
    expect(runner.match(/passwordForm\.locator\(/g)).toHaveLength(6);
    expect(runner).toContain("await passwordForm.locator('button[type=\"submit\"]').isDisabled()");
    expect(runner).not.toContain("page.locator('form input[type=");
    expect(runner).not.toContain("page.locator('form button[type=");
    expect(runner).toContain("failureDetail = 'password_form_email_input_unavailable'");
    expect(runner).toContain("failureDetail = 'password_form_password_input_unavailable'");
    expect(runner).toContain("failureDetail = 'valid_password_input_unavailable'");
    expect(runner).toContain("failureDetail = 'valid_password_submit_unavailable'");
  });
});
