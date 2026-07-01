import { expect, test } from '@playwright/test';

const LOCALE = 'pt';

test.describe('public prelaunch waitlist', () => {
  test('landing renders waitlist form without floating shortcuts', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /lista de espera enterprise/i })).toBeVisible();
    await expect(page.getByLabel(/Nome da empresa/i)).toBeVisible();
    await expect(page.getByLabel(/Email profissional/i)).toBeVisible();
    await expect(page.getByLabel(/Cargo da pessoa/i)).toBeVisible();
    await expect(page.locator('.fixed.bottom-5.left-5')).toHaveCount(0);
  });
});
