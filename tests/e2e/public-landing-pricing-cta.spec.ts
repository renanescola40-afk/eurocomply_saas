import { expect, test } from '@playwright/test';

const LOCALE = 'pt';

test.describe('public landing controlled-access CTA navigation', () => {
  test('primary public CTA anchors to the early-access form', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    const earlyAccessSection = page.locator('section#early-access');
    await expect(earlyAccessSection).toBeVisible();

    const requestAccessLink = page.getByRole('link', { name: /Request access|Solicitar acesso|Pedir acesso|Early access/i }).first();
    await expect(requestAccessLink).toBeVisible();
    await expect(requestAccessLink).toHaveAttribute('href', '#early-access');

    await requestAccessLink.click();
    await expect(earlyAccessSection).toBeInViewport();
    await expect(page.getByRole('button', { name: /Request access|Solicitar acesso|Pedir acesso/i })).toBeVisible();
  });
});
