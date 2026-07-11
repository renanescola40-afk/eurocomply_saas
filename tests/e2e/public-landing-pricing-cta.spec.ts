import { expect, test } from '@playwright/test';

const LOCALE = 'pt';

test.describe('public landing controlled-access CTA navigation', () => {
  test('primary public CTA anchors to the waitlist form', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    const waitlistForm = page.locator('#waitlist-form');
    await expect(waitlistForm).toBeVisible();

    const requestAccessLink = page.getByRole('link', { name: /Request access|Solicitar acesso|Pedir acesso|Early access/i }).first();
    await expect(requestAccessLink).toBeVisible();
    await expect(requestAccessLink).toHaveAttribute('href', '#waitlist-form');

    await requestAccessLink.click();
    await expect(waitlistForm).toBeInViewport();
    await expect(page.getByRole('button', { name: /Request access|Solicitar acesso|Pedir acesso/i })).toBeVisible();
  });
});
