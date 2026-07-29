import { expect, test } from '@playwright/test';

test.describe('B2B onboarding', () => {
  test('protects localized onboarding and preserves selected plan', async ({ page }) => {
    await page.goto('/pt/onboarding?plan=professional', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/pt\/login\?next=/);
    await expect(page).toHaveURL(/%2Fpt%2Fonboarding%3Fplan%3Dprofessional/);
  });

  test('keeps public conversion CTA pointed at localized signup', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const conversionCta = page.getByRole('link', { name: /create account|get started|start/i }).first();
    await expect(conversionCta).toBeVisible();
    await expect(conversionCta).toHaveAttribute('href', '/en/signup');
  });
});
