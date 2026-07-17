import { expect, test, type Page } from '@playwright/test';

const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
const PUBLIC_SURFACES = ['/', '/pricing', '/login'] as const;

async function expectHealthyPublicSurface(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('main').first(), `${label} should expose a primary content region`).toBeVisible();
  await expect(page.locator('body'), `${label} must not expose framework errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|Stack trace|ReferenceError:|TypeError:|SyntaxError:|webpack-internal|NEXT_REDIRECT/i,
  );

  expect(page.url(), `${label} must not navigate to an undefined route`).not.toContain('/undefined');

  const invalidVisibleLinks = await page.locator('a').evaluateAll((links) =>
    links.filter((link) => {
      const anchor = link as HTMLAnchorElement;
      const style = window.getComputedStyle(anchor);
      const rect = anchor.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      const href = anchor.getAttribute('href') ?? '';
      return visible && (!href || href === '#' || href.includes('/undefined'));
    }).length,
  );

  expect(invalidVisibleLinks, `${label} must not expose visible placeholder links`).toBe(0);
}

async function expectLocale(page: Page, locale: string, label: string) {
  await expect(page.locator('html'), `${label} should declare its requested locale`).toHaveAttribute('lang', locale);
  expect(new URL(page.url()).pathname, `${label} should retain the locale prefix`).toMatch(new RegExp(`^/${locale}(?:/|$)`));
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document, `${label} should not overflow horizontally`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

test.describe('enterprise public UX acceptance', () => {
  for (const locale of SUPPORTED_LOCALES) {
    test(`${locale} landing is localized, healthy and conversion-ready`, async ({ page }) => {
      const response = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${locale} landing should not fail`).toBeLessThan(500);
      await expectHealthyPublicSurface(page, `${locale} landing`);
      await expectLocale(page, locale, `${locale} landing`);
      await expect(page.locator('h1').first()).toBeVisible();

      const waitlistForms = page.locator('#waitlist-form');
      await expect(
        waitlistForms,
        `${locale} landing should settle with one uniquely addressable waitlist form`,
      ).toHaveCount(1);
      await expect(page.locator('main').first().locator('#waitlist-form')).toBeVisible();

      expect(await page.locator('a[href], button').count(), `${locale} landing should expose actionable controls`).toBeGreaterThanOrEqual(3);
    });

    test(`${locale} pricing is localized, healthy and actionable`, async ({ page }) => {
      const response = await page.goto(`/${locale}/pricing`, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${locale} pricing should not fail`).toBeLessThan(500);
      await expectHealthyPublicSurface(page, `${locale} pricing`);
      await expectLocale(page, locale, `${locale} pricing`);
      await expect(page.locator('h1').first()).toBeVisible();
      expect(
        await page.locator('a[href]:not([href="#"]):not([href*="/undefined"]), button').count(),
        `${locale} pricing should expose actionable controls`,
      ).toBeGreaterThanOrEqual(3);
    });

    test(`${locale} login is localized, healthy and usable`, async ({ page }) => {
      const response = await page.goto(`/${locale}/login`, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${locale} login should not fail`).toBeLessThan(500);
      await expectHealthyPublicSurface(page, `${locale} login`);
      await expectLocale(page, locale, `${locale} login`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    });
  }

  test('mobile public conversion surfaces remain usable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const surface of PUBLIC_SURFACES) {
      const path = surface === '/' ? '/pt' : `/pt${surface}`;
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${path} should not fail on mobile`).toBeLessThan(500);
      await expectHealthyPublicSurface(page, `mobile ${path}`);
      await expectNoHorizontalOverflow(page, `mobile ${path}`);
      expect(await page.locator('a[href], button, input').count(), `${path} should retain interactive controls`).toBeGreaterThan(0);
    }
  });
});
