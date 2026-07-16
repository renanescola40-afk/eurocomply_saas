import { expect, test, type Page } from '@playwright/test';

const publicRoutes = ['/en', '/en/pricing', '/en/trust', '/en/security'] as const;
const SEO_DESCRIPTION_PATTERN =
  /RISCK|AI|Security|Trust|readiness|governance|controls|buyer-ready|enterprise|protect customer workspaces|Application and infrastructure controls/i;

function normalizePathname(pathname: string) {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

async function expectSeoMetadata(page: Page, path: string) {
  await expect(page.getByRole('main').first()).toBeVisible();
  await expect(page.locator('h1').first()).toBeVisible();
  expect(await page.title()).not.toBe('');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', SEO_DESCRIPTION_PATTERN);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /RISCK|Security|Trust|Pricing/i);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', SEO_DESCRIPTION_PATTERN);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /summary/);

  const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonicalHref).toBeTruthy();
  expect(normalizePathname(new URL(canonicalHref || 'https://example.invalid').pathname)).toBe(normalizePathname(path));

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

    let focusedControl:
      | { tagName: string; outlineStyle: string; outlineWidth: string; boxShadow: string }
      | undefined;

    // Radix dialogs may insert focus guards into the tab order. Walk past those
    // sentinels, but keep the search bounded so a broken tab order still fails.
    for (let tabIndex = 0; tabIndex < 8; tabIndex += 1) {
      await page.keyboard.press('Tab');
      focusedControl = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLElement)) return undefined;
        if (!activeElement.matches('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')) {
          return undefined;
        }

        const style = window.getComputedStyle(activeElement);
        return {
          tagName: activeElement.tagName,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      });

      if (focusedControl) break;
    }

    expect(focusedControl, 'keyboard navigation should reach an actionable control').toBeDefined();
    const outlineWidth = Number.parseFloat(focusedControl?.outlineWidth ?? '0');
    const hasOutline = focusedControl?.outlineStyle !== 'none' && outlineWidth > 0;
    const hasBoxShadow = focusedControl?.boxShadow !== 'none';
    expect(hasOutline || hasBoxShadow, 'focused control should expose a visible focus indicator').toBe(true);
  });
});
