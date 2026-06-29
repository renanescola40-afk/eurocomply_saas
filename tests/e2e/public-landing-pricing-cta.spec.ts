import { expect, test } from '@playwright/test';

const LOCALE = 'pt';

test.describe('public landing pricing CTA navigation', () => {
  test('self-serve pricing CTA opens the public checkout flow', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    const pricingSection = page.locator('section#pricing');
    await expect(pricingSection).toBeVisible();

    await page.waitForFunction((locale) => {
      return Array.from(document.querySelectorAll<HTMLAnchorElement>('section#pricing a[href]')).some((anchor) => {
        const href = anchor.getAttribute('href') ?? '';
        return href === `/${locale}/checkout?plan=professional` || href === `/${locale}/billing/checkout/professional`;
      });
    }, LOCALE);

    const pricingTrialLink = pricingSection
      .locator(`a[href="/${LOCALE}/checkout?plan=professional"], a[href="/${LOCALE}/billing/checkout/professional"]`)
      .first();

    await expect(pricingTrialLink).toBeVisible();
    await expect(pricingTrialLink).toBeEnabled();

    await pricingTrialLink.click();
    await page.waitForFunction((locale) => {
      const url = new URL(window.location.href);
      return url.pathname === `/${locale}/checkout` && url.searchParams.get('plan') === 'professional';
    }, LOCALE);

    const url = new URL(page.url());
    expect(url.pathname).toBe(`/${LOCALE}/checkout`);
    expect(url.searchParams.get('plan')).toBe('professional');
    await expect(page.locator('body')).toBeVisible();
  });
});
