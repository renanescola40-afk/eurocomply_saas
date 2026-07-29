import { expect, test } from '@playwright/test';

const locales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;

test.describe('public enterprise procurement pack', () => {
  for (const locale of locales) {
    test(`renders for ${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}/trust/procurement-pack`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('a[href="/api/trust/procurement-pack"]')).toBeVisible();
      await expect(page.locator(`a[href="/${locale}/trust"]`)).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow).toBe(false);
    });
  }

  test('returns a sanitized public JSON pack', async ({ request }) => {
    const response = await request.get('/api/trust/procurement-pack');
    expect(response.ok()).toBe(true);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    const body = await response.json();
    expect(body.product).toBe('RISCK COMPLY');
    expect(body.schemaVersion).toBe(1);
    expect(Array.isArray(body.controls)).toBe(true);
    expect(Array.isArray(body.providers)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/secret|password|token|service_role/i);
  });
});
