import { expect, test } from '@playwright/test';

const locales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;

test.describe('public enterprise procurement pack', () => {
  for (const locale of locales) {
    test(`renders for ${locale}`, async ({ page }) => {
      const expectedPath = `/${locale}/trust/procurement-pack`;
      const response = await page.goto(expectedPath, { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(400);
      expect(new URL(page.url()).pathname).toBe(expectedPath);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const destinations = await page.locator('a[href]').evaluateAll((links) =>
        links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
      );
      expect(destinations).toContain('/api/trust/procurement-pack');
      expect(destinations).toContain(`/${locale}/trust`);

      const layout = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const documentWidth = document.documentElement.scrollWidth;
        return { viewportWidth, documentWidth, overflows: documentWidth > viewportWidth + 1 };
      });
      expect(layout.overflows, `document width ${layout.documentWidth}px exceeds viewport ${layout.viewportWidth}px`).toBe(false);
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
