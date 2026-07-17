import { expect, test } from '@playwright/test';

test.describe('enterprise account recovery', () => {
  test('login exposes a localized recovery entrypoint', async ({ page }) => {
    await page.goto('/pt/login', { waitUntil: 'domcontentloaded' });

    const recoveryLink = page.getByRole('link', { name: /esqueceu a senha/i });
    await expect(recoveryLink).toBeVisible();
    await expect(recoveryLink).toHaveAttribute('href', '/pt/recuperar-senha');
  });

  test('recovery request presents the same generic success message', async ({ page }) => {
    await page.route('**/api/auth/recovery', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          ok: true,
          message: 'If an account exists for that email, a secure recovery link will be sent.',
        }),
      });
    });

    await page.goto('/en/recuperar-senha', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Work email').fill('synthetic-recovery@example.test');
    await page.getByRole('button', { name: 'Send recovery link' }).click();

    await expect(page.getByRole('status')).toContainText(
      'If an account exists for that email, a secure recovery link will be sent.',
    );
    await expect(page.getByLabel('Work email')).toHaveValue('');
    await expect(page.locator('body')).not.toContainText('synthetic-recovery@example.test');
  });

  test('recovery request exposes a controlled provider failure', async ({ page }) => {
    await page.route('**/api/auth/recovery', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({ error: 'account_recovery_unavailable' }),
      });
    });

    await page.goto('/pt/recuperar-senha', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email profissional').fill('synthetic-recovery@example.test');
    await page.getByRole('button', { name: 'Enviar link de recuperação' }).click();

    await expect(page.getByRole('alert')).toContainText(/temporariamente indisponível/i);
    await expect(page.locator('body')).not.toContainText('account_recovery_unavailable');
  });

  test('reset completion rejects a missing or expired recovery session', async ({ page }) => {
    await page.goto('/en/reset-password', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('alert')).toContainText(/invalid or expired/i);
    await expect(page.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/en/recuperar-senha',
    );
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });
});
