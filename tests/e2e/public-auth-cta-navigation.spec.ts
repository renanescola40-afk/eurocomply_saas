import { expect, test } from '@playwright/test';

const LOCALE = 'en';

test.describe('public production auth navigation', () => {
  test('landing exposes canonical English login, signup and pricing routes', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').first()).toContainText(/AI moves fast\.\s*Governance keeps up\./i);
    await expect(page.locator(`a[href="/${LOCALE}/signup"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="/${LOCALE}/login"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="/${LOCALE}/pricing"]`).first()).toBeVisible();
    await expect(page.locator('#waitlist-form')).toHaveCount(0);
    await expect(page.locator('.fixed.bottom-5.left-5')).toHaveCount(0);
  });
});
