import { expect, test } from '@playwright/test';

test.describe('B2B onboarding', () => {
  test('protects canonical English onboarding and preserves selected plan', async ({ page }) => {
    await page.goto('/en/onboarding?plan=professional', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/en\/login\?next=/);
    await expect(page).toHaveURL(/%2Fen%2Fonboarding%3Fplan%3Dprofessional/);
  });

  test('keeps public conversion CTA pointed at localized signup', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const conversionCta = page.getByRole('link', { name: /create account|get started|start/i }).first();
    await expect(conversionCta).toBeVisible();
    await expect(conversionCta).toHaveAttribute('href', '/en/signup');
  });
});
