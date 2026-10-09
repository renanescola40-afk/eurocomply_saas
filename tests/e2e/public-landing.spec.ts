import { expect, test, type Page } from '@playwright/test';

const historicalLocales = ['pt', 'es', 'fr', 'it', 'de'] as const;

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow, `${label} has horizontal overflow`).toBe(false);
}

async function expectProductionLanding(page: Page) {
  const response = await page.goto('/en', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: /RISCK COMPLY/i }).first()).toBeVisible();
  await expect(page.locator('main h1:visible').first()).toContainText(/AI moves fast\.\s*Governance keeps up\./i);
  await expect(page.locator('body')).toContainText(/AI inventory|risk assessments/i);
  await expect(page.locator('body')).toContainText(/evidence workflows|activity history/i);
  for (const path of ['/en/signup', '/en/login', '/en/pricing']) {
    await expect(page.locator(`a[href="${path}"]:visible`).first()).toBeVisible();
  }
}

test.describe('public production landing', () => {
  test('renders the canonical EN production landing', async ({ page }) => {
    await expectProductionLanding(page);
    await expectNoHorizontalOverflow(page, 'EN production landing desktop');
  });

  for (const locale of historicalLocales) {
    test(`redirects historical ${locale.toUpperCase()} landing to canonical English`, async ({ page }) => {
      const response = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page).toHaveURL(/\/en\/?$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  }

  test('exposes only canonical English in the language selector', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    const selector = page.locator('[aria-label="Select language"]:visible').first();
    await expect(selector).toBeVisible();
    await expect(selector.getByRole('link', { name: /^en$/i })).toBeVisible();
    await expect(page.locator('a[href="/pt"]')).toHaveCount(0);
  });

  test('routes primary conversion CTAs to authentication and pricing', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('a[href="/en/signup"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/en/login"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/en/pricing"]:visible').first()).toBeVisible();
  });

  test('renders required production sections on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('One operational source of truth').first()).toBeVisible();
    await expect(page.getByText('From discovery to review').first()).toBeVisible();
    await expect(page.getByText('Controlled by design').first()).toBeVisible();
    await expect(page.locator('a[href="/en/signup"]:visible').first()).toBeVisible();
    await expectNoHorizontalOverflow(page, 'production landing mobile');
  });
});
