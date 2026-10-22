import { expect, test } from '@playwright/test';

test('anonymous retention export is refused without a downloadable evidence payload', async ({ request }) => {
  const response = await request.get('/api/retention-center/export', { maxRedirects: 0 });

  expect([401, 403, 302, 303, 307, 308]).toContain(response.status());
  expect(response.headers()['content-disposition']).toBeUndefined();
  expect(await response.text()).not.toContain('risckcomply.retention_policy_review_export');
});

test.describe('paid owner retention export: live UI and MFA boundary', () => {
  const ownerStorageState = process.env.E2E_OWNER_STORAGE_STATE;
  const ownerEmail = process.env.E2E_OWNER_EMAIL?.trim();
  const ownerPassword = process.env.E2E_OWNER_PASSWORD;
  const hasDisposableCredentials = Boolean(ownerEmail && ownerPassword);
  const isolatedTarget = (() => {
    try {
      const target = new URL(process.env.E2E_BASE_URL ?? '');
      const db = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
      const hostname = target.hostname.toLowerCase().replace(/\.+$/, '');
      const dbHost = db.hostname.toLowerCase().replace(/\.+$/, '');
      return target.protocol === 'https:' && !target.username && !target.password &&
        !target.port && target.pathname === '/' && !target.search && !target.hash &&
        hostname !== 'risckcomply.com' && !hostname.endsWith('.risckcomply.com') &&
        hostname !== 'eurocomply-saas.vercel.app' &&
        hostname !== 'eurocomply-saas-renanescola40-afks-projects.vercel.app' &&
        hostname !== 'eurocomply-saas-git-main-renanescola40-afks-projects.vercel.app' &&
        hostname !== 'eurocomply-saas-o6ws7qrp2-renanescola40-afks-projects.vercel.app' &&
        db.protocol === 'https:' && !db.username && !db.password && !db.port &&
        db.pathname === '/' && !db.search && !db.hash &&
        /^[a-z0-9]+\.supabase\.co$/i.test(dbHost) &&
        dbHost !== 'tganhbbhfxcpblmgqprg.supabase.co' &&
        /^[a-z0-9]{20}$/.test(process.env.E2E_QA_APPROVED_SUPABASE_REF ?? '') &&
        dbHost === `${process.env.E2E_QA_APPROVED_SUPABASE_REF}.supabase.co` &&
        process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') === true &&
        process.env.E2E_QA_MAIL_SINK_CONFIRMED === 'true';
    } catch {
      return false;
    }
  })();
  test.skip(!isolatedTarget, 'Paid-owner E2E requires isolated app/Supabase, Stripe TEST and a confirmed QA mail sink.');
  test.skip(!ownerStorageState && !hasDisposableCredentials,
    'Requires disposable paid-owner credentials or an existing isolated QA browser session.');
  if (ownerStorageState) test.use({ storageState: ownerStorageState });

  test('owner clicks export, receives MFA dialog, and unverified API request is denied', async ({ page }) => {
    // The isolated QA workflow provides E2E_OWNER_EMAIL/PASSWORD, not a storageState file.
    // Authenticate through the actual UI rather than silently skipping paid-owner coverage.
    if (!ownerStorageState) {
      // The login route intentionally allows only selected return destinations.
      // Target the approved organization dashboard, then navigate to retention after authentication.
      const loginResponse = await page.goto('/en/login?next=%2Fen%2Fdashboard%2Forganizations', {
        waitUntil: 'domcontentloaded',
      });
      expect(loginResponse?.status()).toBeLessThan(500);
      const emailInput = page.getByRole('textbox', { name: 'Work email', exact: true });
      const loginForm = page.locator('form').filter({ has: emailInput });
      await expect(loginForm).toHaveCount(1);
      await emailInput.fill(ownerEmail!);
      await loginForm.getByLabel('Password', { exact: true }).fill(ownerPassword!);
      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), {
          timeout: 30_000, waitUntil: 'domcontentloaded',
        }),
        loginForm.locator('button[type="submit"]').click(),
      ]);
    }

    const pageResponse = await page.goto('/en/retention-center', { waitUntil: 'domcontentloaded' });

    expect(pageResponse?.status()).toBeLessThan(500);
    expect(page.url()).not.toContain('/login');

    const exportButton = page.getByRole('button', { name: 'Export retention review JSON' });
    await expect(exportButton).toBeVisible();
    await exportButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // No OTP and no step-up token: a business-plan owner must still be denied.
    // The export must not be generated; the step-up denial may still append a
    // security audit record. Run this only on a disposable, isolated QA tenant.
    const apiResponse = await page.request.get('/api/retention-center/export', { maxRedirects: 0 });
    expect(apiResponse.status()).toBe(403);
    // A generic 403 could mean no membership, insufficient plan, or another
    // guard failure. Only an explicit step_up_required proves the MFA boundary.
    const denial = await apiResponse.json();
    expect(denial?.error).toBe('step_up_required');
    expect(apiResponse.headers()['content-disposition']).toBeUndefined();
    expect(JSON.stringify(denial)).not.toContain('risckcomply.retention_policy_review_export');
  });
});
