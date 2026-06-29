import { expect, test } from '@playwright/test';

const LOCALE = 'pt';

test.describe('public landing pricing CTA navigation', () => {
  test('professional pricing CTA opens the public checkout flow', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    const pricingTrialLink = page.locator('section#pricing').getByRole('link', { name: /Iniciar trial/i }).first();
    await expect(pricingTrialLink).toBeVisible();
    await expect(pricingTrialLink).toBeEnabled();

    await pricingTrialLink.click();
    await page.waitForURL('**/pt/checkout?plan=professional');

    const url = new URL(page.url());
    expect(url.pathname).toBe(`/${LOCALE}/checkout`);
    expect(url.searchParams.get('plan')).toBe('professional');
    await expect(page.locator('body')).toBeVisible();
  });
});
