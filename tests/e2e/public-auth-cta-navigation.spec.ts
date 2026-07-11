import { expect, test } from '@playwright/test';

const LOCALE = 'pt';

test.describe('public controlled-access waitlist', () => {
  test('landing renders the lead capture surface only', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1')).toContainText(/governança de IA|compliance/i);
    await expect(page.getByLabel(/Nome da empresa/i)).toBeVisible();
    await expect(page.getByLabel(/Email profissional/i)).toBeVisible();
    await expect(page.getByLabel(/Cargo da pessoa/i)).toBeVisible();
    await expect(page.locator('#waitlist-form')).toBeVisible();
    await expect(page.locator('.fixed.bottom-5.left-5')).toHaveCount(0);
  });
});
