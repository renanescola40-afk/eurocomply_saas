import { expect, test } from '@playwright/test';

test('anonymous retention export is refused without a downloadable evidence payload', async ({ request }) => {
  const response = await request.get('/api/retention-center/export', { maxRedirects: 0 });

  expect([401, 403, 302, 303, 307, 308]).toContain(response.status());
  expect(response.headers()['content-disposition']).toBeUndefined();
  expect(await response.text()).not.toContain('risckcomply.retention_policy_review_export');
});

test.describe('paid owner retention export: live UI and MFA boundary', () => {
  const ownerStorageState = process.env.E2E_OWNER_STORAGE_STATE;
  test.skip(!ownerStorageState, 'Requires an existing disposable paid owner browser session.');
  if (ownerStorageState) test.use({ storageState: ownerStorageState });

  test('owner clicks export, receives MFA dialog, and unverified API request is denied', async ({ page }) => {
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
