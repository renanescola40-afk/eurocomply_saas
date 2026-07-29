import { expect, test } from '@playwright/test';

const LOCALE = 'pt';

test.describe('public landing production CTA navigation', () => {
  test('primary public CTAs route to signup, login and pricing', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    const signupLink = page.locator(`a[href="/${LOCALE}/signup"]`).first();
    const loginLink = page.locator(`a[href="/${LOCALE}/login"]`).first();
    const pricingLink = page.locator(`a[href="/${LOCALE}/pricing"]`).first();

    await expect(signupLink).toBeVisible();
    await expect(loginLink).toBeVisible();
    await expect(pricingLink).toBeVisible();
    await expect(page.locator('#waitlist-form')).toHaveCount(0);

    await pricingLink.click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/pricing(?:$|[?#])`));
    await expect(page.locator('main')).toBeVisible();
  });
});
