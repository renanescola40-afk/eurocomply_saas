import { expect, test, type Page } from '@playwright/test';

const CONSENT_STORAGE_KEY = 'risckcomply.analytics.consent';

async function expectHealthyResponsiveSurface(page: Page, route: string, width: number) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i);

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    hasMain: Boolean(document.querySelector('main')),
  }));

  expect(metrics.hasMain, `${route} should render its primary main landmark`).toBe(true);
  expect(metrics.scrollWidth, `${route} should not overflow the ${width}px viewport`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(page.url(), `${route} should not navigate to an undefined route`).not.toContain('/undefined');
}

const publicCommercialRoutes = [
  '/pt/pricing',
  '/pt/checkout?plan=professional',
  '/pt/login',
  '/pt/signup?plan=professional',
  '/pt/trust',
] as const;

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const) {
  test.describe(`${viewport.name} commercial acceptance`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // Consent focus management has its own runtime acceptance suite. Keep this
      // suite scoped to the commercial form controls after a persisted decision.
      await page.addInitScript((storageKey) => {
        window.localStorage.setItem(storageKey, 'denied');
      }, CONSENT_STORAGE_KEY);
    });

    for (const route of publicCommercialRoutes) {
      test(`${route} remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await expectHealthyResponsiveSurface(page, route, viewport.width);
      });
    }

    test('pricing keeps a visible primary conversion action', async ({ page }) => {
      await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('link', { name: /iniciar teste|professional|demo|vendas/i }).first()).toBeVisible();
    });

    test('checkout keeps the selected-plan action reachable without horizontal scrolling', async ({ page }) => {
      await page.goto('/pt/checkout?plan=professional', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/Professional/).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /criar conta e continuar|entrar e continuar/i }).first()).toBeVisible();
    });

    test('login and signup retain visible labels and keyboard-focusable controls', async ({ page }) => {
      await page.goto('/pt/login', { waitUntil: 'domcontentloaded' });
      const email = page.getByRole('textbox', { name: /^email profissional$/i });
      await expect(email).toBeVisible();
      await email.focus();
      await expect(email).toBeFocused();

      await page.goto('/pt/signup?plan=professional', { waitUntil: 'domcontentloaded' });
      const signupEmail = page.getByRole('textbox', { name: /^email profissional$/i });
      await expect(signupEmail).toBeVisible();
      await signupEmail.focus();
      await expect(signupEmail).toBeFocused();
    });
  });
}
