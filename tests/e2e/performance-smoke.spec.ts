import { expect, test, type Page } from '@playwright/test';

const STRICT_PERFORMANCE = process.env.PERFORMANCE_SMOKE_STRICT === 'true';
const LANDING_DOM_CONTENT_LOADED_BUDGET_MS = Number(process.env.LANDING_DCL_BUDGET_MS ?? 8_000);
const DASHBOARD_DOM_CONTENT_LOADED_BUDGET_MS = Number(process.env.DASHBOARD_DCL_BUDGET_MS ?? 10_000);
const BILLING_DOM_CONTENT_LOADED_BUDGET_MS = Number(process.env.BILLING_DCL_BUDGET_MS ?? 10_000);
const DOCUMENTS_DOM_CONTENT_LOADED_BUDGET_MS = Number(process.env.DOCUMENTS_DCL_BUDGET_MS ?? 10_000);
const RISKS_DOM_CONTENT_LOADED_BUDGET_MS = Number(process.env.RISKS_DCL_BUDGET_MS ?? 10_000);

type NavigationTiming = {
  domContentLoadedEventEnd?: number;
  responseStart?: number;
};

async function getNavigationTiming(page: Page): Promise<NavigationTiming> {
  return page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return {
      domContentLoadedEventEnd: entry?.domContentLoadedEventEnd,
      responseStart: entry?.responseStart,
    };
  });
}

async function expectNoSensitiveCache(response: Awaited<ReturnType<Page['request']['get']>>, label: string) {
  const cacheControl = response.headers()['cache-control'] ?? '';
  expect(cacheControl.toLowerCase(), `${label} must not be cacheable`).toContain('no-store');
}

async function expectProtectedRouteStable(page: Page, path: string, label: string, budgetMs: number) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

  expect(response?.status(), `${label} did not return a response`).toBeDefined();
  expect(response?.status(), `${label} returned a server error`).toBeLessThan(500);
  await expect(page).toHaveURL(/\/pt\/login/);
  await expect(page.locator('body')).toBeVisible();

  const timing = await getNavigationTiming(page);
  test.info().annotations.push({
    type: `${label}-domcontentloaded-ms`,
    description: String(Math.round(timing.domContentLoadedEventEnd ?? 0)),
  });

  if (STRICT_PERFORMANCE) {
    expect(timing.domContentLoadedEventEnd ?? Number.POSITIVE_INFINITY).toBeLessThan(budgetMs);
  }
}

test.describe('RISCK COMPLY performance smoke', () => {
  test('landing page loads and records browser timing', async ({ page }) => {
    const response = await page.goto('/pt', { waitUntil: 'domcontentloaded' });

    expect(response?.status(), 'landing did not return a response').toBeDefined();
    expect(response?.status(), 'landing returned a server error').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/RISCK COMPLY/i).first()).toBeVisible();

    const timing = await getNavigationTiming(page);
    test.info().annotations.push({
      type: 'landing-domcontentloaded-ms',
      description: String(Math.round(timing.domContentLoadedEventEnd ?? 0)),
    });

    if (STRICT_PERFORMANCE) {
      expect(timing.domContentLoadedEventEnd ?? Number.POSITIVE_INFINITY).toBeLessThan(LANDING_DOM_CONTENT_LOADED_BUDGET_MS);
    }
  });

  test('dashboard route is stable and protected for anonymous users', async ({ page }) => {
    await expectProtectedRouteStable(page, '/pt/dashboard/organizations', 'dashboard-redirect', DASHBOARD_DOM_CONTENT_LOADED_BUDGET_MS);
  });

  test('billing route is stable and protected for anonymous users', async ({ page }) => {
    await expectProtectedRouteStable(page, '/pt/dashboard/organizations/billing', 'billing-redirect', BILLING_DOM_CONTENT_LOADED_BUDGET_MS);
  });

  test('documents route is stable and protected for anonymous users', async ({ page }) => {
    await expectProtectedRouteStable(page, '/pt/dashboard/organizations/documents', 'documents', DOCUMENTS_DOM_CONTENT_LOADED_BUDGET_MS);
  });

  test('risks route is stable and protected for anonymous users', async ({ page }) => {
    await expectProtectedRouteStable(page, '/pt/dashboard/organizations/risks', 'risks', RISKS_DOM_CONTENT_LOADED_BUDGET_MS);
  });

  test('critical health API responds without sensitive caching', async ({ page }) => {
    const response = await page.request.get('/api/health', { failOnStatusCode: false });

    expect(response.status()).toBe(200);
    await expectNoSensitiveCache(response, '/api/health');
    await expect(response).toBeOK();
  });

  test('readiness API fails closed or rejects unauthorized access without caching', async ({ page }) => {
    const response = await page.request.get('/api/ready', { failOnStatusCode: false });

    expect([401, 503], 'readiness must reject unauthorized access or fail closed when its limiter is unavailable').toContain(response.status());
    await expectNoSensitiveCache(response, '/api/ready protected response');
  });
});
