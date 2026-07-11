import { expect, test, type Page } from '@playwright/test';

const publicRoutes = ['/en', '/en/pricing', '/en/trust', '/en/security'] as const;

async function expectSeoMetadata(page: Page, path: string) {
  await expect(page.getByRole('main').first()).toBeVisible();
  await expect(page.locator('h1').first()).toBeVisible();
  expect(await page.title()).not.toBe('');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /RISCK|AI|Security|Trust|readiness|governance|protect customer workspaces|Application and infrastructure controls/i);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /RISCK|Security|Trust|Pricing/i);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /RISCK|AI|Security|Trust|readiness|governance|protect customer workspaces|Application and infrastructure controls/i);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /summary/);

  const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonicalHref).toBeTruthy();
  expect(new URL(canonicalHref || 'https://example.invalid').pathname).toBe(path);

  await expect(page.locator('link[rel="alternate"][hreflang="pt-PT"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
}

test.describe('public SEO and accessibility smoke', () => {
  for (const route of publicRoutes) {
    test(`${route} exposes core SEO metadata and landmarks`, async ({ page }) => {
      await page.goto(route);
      await expectSeoMetadata(page, route);
    });
  }

  test('pricing page exposes structured data and accessible comparison headers', async ({ page }) => {
    await page.goto('/en/pricing');

    const structuredData = page.locator('script[type="application/ld+json"]');
    await expect(structuredData).toHaveCount(1);
    await expect(page.locator('th[scope="row"]')).toHaveCount(6);
    await expect(page.locator('th[scope="col"]')).toHaveCount(5);
  });

  test('mobile landing keeps content within viewport and keyboard focus visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toMatch(/A|BUTTON|INPUT|SELECT/);
  });
});
