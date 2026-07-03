import { expect, test } from '@playwright/test';

test.describe('B2B onboarding', () => {
  test('protects localized onboarding and preserves selected plan', async ({ page }) => {
    await page.goto('/pt/onboarding?plan=professional', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/pt\/login\?next=/);
    await expect(page).toHaveURL(/%2Fpt%2Fonboarding%3Fplan%3Dprofessional/);
  });

  test('keeps public conversion CTA pointed at the lead form', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /^Join waitlist$/i }).first()).toHaveAttribute('href', '#waitlist-form');
    await expect(page.locator('#waitlist-form')).toBeVisible();
  });
});
