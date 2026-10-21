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
      const base = process.env.E2E_BASE_URL;
      if (!base) return false;
      const target = new URL(base);
      return target.protocol === 'https:' &&
        !['risckcomply.com', 'www.risckcomply.com'].includes(target.hostname.toLowerCase());
    } catch {
      return false;
    }
  })();
  test.skip(!isolatedTarget, 'Paid-owner E2E requires an explicit isolated HTTPS QA target, never production.');
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
    // This is deliberately read-only; a successful export would append a real audit event.
    const apiResponse = await page.request.get('/api/retention-center/export', { maxRedirects: 0 });
    expect(apiResponse.status()).toBe(403);
    expect(apiResponse.headers()['content-disposition']).toBeUndefined();
    expect(await apiResponse.text()).not.toContain('risckcomply.retention_policy_review_export');
  });
});
