import { expect, test, type Page } from '@playwright/test';

async function expectHealthyDocument(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not show Next.js/runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should never navigate to /undefined`).not.toContain('/undefined');
}

const historicalLocales = ['pt', 'es', 'fr', 'it', 'de'] as const;

const commercialRoutes = ['/en/pricing', '/en/checkout?plan=professional', '/en/login', '/en/signup?plan=professional'] as const;

async function expectNoDocumentOverflow(page: Page, route: string, label: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expectHealthyDocument(page, `${label} ${route}`);
  const overflowsViewport = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflowsViewport, `${route} should not overflow the ${label} viewport`).toBe(false);
}

test.describe('public product journey', () => {
  test('landing and pricing production CTAs stay routable on canonical English routes', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en(?:$|[?#])/);
    await expectHealthyDocument(page, 'landing');
    await expect(page.locator('a[href="/en/signup"]').first()).toBeVisible();
    await expect(page.locator('a[href="/en/login"]').first()).toBeVisible();
    await expect(page.locator('a[href="/en/pricing"]').first()).toBeVisible();
    await expect(page.locator('#waitlist-form')).toHaveCount(0);

    await page.goto('/en/pricing', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/pricing(?:$|[?#])/);
    await expectHealthyDocument(page, 'pricing');
  });

  for (const locale of historicalLocales) {
    test(`${locale} commercial routes redirect to canonical English`, async ({ page }) => {
      for (const path of ['/pricing', '/checkout?plan=professional', '/login', '/signup?plan=professional']) {
        await page.goto(`/${locale}${path}`, { waitUntil: 'domcontentloaded' });
        const expectedPath = path.split('?')[0];
        await expect(page).toHaveURL(new RegExp(`/en${expectedPath.replaceAll('/', '\\/')}(?:$|[?#])`));
        await expectHealthyDocument(page, `${locale} -> en ${path}`);
      }
    });
  }

  test('pricing exposes only actionable critical CTAs', async ({ page }) => {
    await page.goto('/en/pricing', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'pricing CTA audit');

    const actionableLinks = await page.locator('a[href]:not([href="#"]):not([href*="/undefined"])').count();
    expect(actionableLinks, 'pricing should expose actionable links').toBeGreaterThanOrEqual(3);

    const brokenCriticalLinks = await page.locator('a[href="#"], a:not([href]), a[href*="/undefined"]').count();
    expect(brokenCriticalLinks, 'pricing should not expose placeholder or /undefined links').toBe(0);
  });

  test('commercial surfaces do not create document-level horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of commercialRoutes) await expectNoDocumentOverflow(page, route, 'mobile');
  });

  test('commercial surfaces remain stable at tablet width', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const route of commercialRoutes) await expectNoDocumentOverflow(page, route, 'tablet');
  });

  test('commercial surfaces remain stable on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const route of commercialRoutes) await expectNoDocumentOverflow(page, route, 'desktop');
  });

  test('signup route is reachable from the production landing', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    const signup = page.locator('a[href="/en/signup"]').first();
    await expect(signup).toBeVisible();
    await signup.click();
    await expect(page).toHaveURL(/\/en\/signup(?:$|[?#])/);
    await expectHealthyDocument(page, 'signup');
  });

  test('login route is reachable from the production landing', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    const login = page.locator('a[href="/en/login"]').first();
    await expect(login).toBeVisible();
    await login.click();
    await expect(page).toHaveURL(/\/en\/login(?:$|[?#])/);
    await expectHealthyDocument(page, 'login');
  });

  test('book demo public route is controlled and healthy', async ({ page }) => {
    await page.goto('/en/book-demo', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'book demo');
    await expect(page.locator('body')).toContainText(/demo|access|acesso|contact|comercial/i);
  });
});

test.describe('auth redirect journey', () => {
  const protectedRoutes = [
    '/en/onboarding?plan=professional',
    '/en/dashboard/organizations',
    '/en/dashboard/organizations/team',
    '/en/dashboard/organizations/documents',
    '/en/dashboard/organizations/risks',
    '/en/dashboard/organizations/billing',
    '/en/vendor-assurance',
    '/en/aprovacoes',
    '/en/ai-systems',
    '/en/dashboard/inventario',
    '/en/auditoria',
    '/en/settings',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects anonymous visitor to login and preserves next`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/en\/login\?next=/);
      await expectHealthyDocument(page, `protected redirect ${route}`);
      expect(decodeURIComponent(new URL(page.url()).searchParams.get('next') ?? '')).toContain(route.split('?')[0]);
    });
  }

  test('anonymous private redirect response is no-store and preserves the next URL', async ({ request }) => {
    const response = await request.get('/en/dashboard/organizations', { maxRedirects: 0 });
    expect([302, 307, 308]).toContain(response.status());
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['location']).toContain('/en/login?next=');
  });
});
