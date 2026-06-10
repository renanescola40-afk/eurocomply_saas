import { expect, test } from '@playwright/test';

const locales = ['en', 'pt', 'es', 'fr'] as const;

test.describe('public landing', () => {
  for (const locale of locales) {
    test(`renders the ${locale.toUpperCase()} public landing`, async ({ page }) => {
      await page.goto(`/${locale}`);

      await expect(page.getByRole('link', { name: /EuroComply/i }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /Entrar|Sign in|Iniciar sesión|Connexion/i })).toBeVisible();
      await expect(page.locator('body')).toContainText(/Compliance|Conformidade|Conformité|Cumplimiento/i);
    });
  }

  test('keeps language options visible before login', async ({ page }) => {
    await page.goto('/en');

    await expect(page.getByRole('link', { name: /^EN$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^PT$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^ES$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^FR$/ })).toBeVisible();
  });
});
