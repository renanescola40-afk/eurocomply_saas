import { expect, test, type Page } from '@playwright/test';

async function expectHealthyDocument(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not show Next.js/runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should never navigate to /undefined`).not.toContain('/undefined');
}

test.describe('public product journey', () => {
  test('landing and pricing production CTAs stay routable and localized', async ({ page }) => {
    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'landing');
    await expect(page.locator('a[href="/pt/signup"]').first()).toBeVisible();
    await expect(page.locator('a[href="/pt/login"]').first()).toBeVisible();
    await expect(page.locator('a[href="/pt/pricing"]').first()).toBeVisible();
    await expect(page.locator('#waitlist-form')).toHaveCount(0);

    await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/pt\/pricing(?:$|[?#])/);
    await expectHealthyDocument(page, 'pricing');
    await expect(page.getByRole('link', { name: /start|começar|trial|demo|sales|vendas/i }).first()).toBeVisible();
  });

  test('pricing exposes only actionable critical CTAs', async ({ page }) => {
    await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'pricing CTA audit');

    const actionableLinks = await page.locator('a[href]:not([href="#"]):not([href*="/undefined"])').count();
    expect(actionableLinks, 'pricing should expose actionable links').toBeGreaterThanOrEqual(3);

    const brokenCriticalLinks = await page.locator('a[href="#"], a:not([href]), a[href*="/undefined"]').count();
    expect(brokenCriticalLinks, 'pricing should not expose placeholder or /undefined links').toBe(0);
  });

  test('signup route is reachable from the production landing', async ({ page }) => {
    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    const signup = page.locator('a[href="/pt/signup"]').first();
    await expect(signup).toBeVisible();
    await signup.click();
    await expect(page).toHaveURL(/\/pt\/signup(?:$|[?#])/);
    await expectHealthyDocument(page, 'signup');
  });

  test('login route is reachable from the production landing', async ({ page }) => {
    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    const login = page.locator('a[href="/pt/login"]').first();
    await expect(login).toBeVisible();
    await login.click();
    await expect(page).toHaveURL(/\/pt\/login(?:$|[?#])/);
    await expectHealthyDocument(page, 'login');
  });

  test('book demo public route is controlled and healthy', async ({ page }) => {
    await page.goto('/pt/book-demo', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'book demo');
    await expect(page.locator('body')).toContainText(/demo|access|acesso|contact|comercial/i);
  });
});

test.describe('auth redirect journey', () => {
  const protectedRoutes = [
    '/pt/onboarding?plan=professional',
    '/pt/dashboard/organizations',
    '/pt/dashboard/organizations/team',
    '/pt/dashboard/organizations/documents',
    '/pt/dashboard/organizations/risks',
    '/pt/dashboard/organizations/billing',
    '/pt/vendor-assurance',
    '/pt/aprovacoes',
    '/pt/ai-systems',
    '/pt/dashboard/inventario',
    '/pt/auditoria',
    '/pt/settings',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects anonymous visitor to login and preserves next`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/pt\/login\?next=/);
      await expectHealthyDocument(page, `protected redirect ${route}`);
      expect(decodeURIComponent(new URL(page.url()).searchParams.get('next') ?? '')).toContain(route.split('?')[0]);
    });
  }

  test('anonymous private redirect response is no-store and preserves the next URL', async ({ request }) => {
    const response = await request.get('/pt/dashboard/organizations', { maxRedirects: 0 });
    expect([302, 307, 308]).toContain(response.status());
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['location']).toContain('/pt/login?next=');
  });
});
