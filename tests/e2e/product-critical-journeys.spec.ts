import { expect, test, type Page } from '@playwright/test';

const syntheticLead = {
  fullName: 'Playwright QA',
  workEmail: 'qa+playwright@example.test',
  companyName: 'Playwright Synthetic Ltd',
  role: 'QA Engineer',
};

async function expectHealthyDocument(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not show Next.js/runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should never navigate to /undefined`).not.toContain('/undefined');
}

async function fillWaitlist(page: Page) {
  await page.locator('#waitlist-form input[placeholder="Acme Europe"]').fill(syntheticLead.companyName);
  await page.locator('#waitlist-form input[type="email"]').fill(syntheticLead.workEmail);
  await page.locator('#waitlist-form input[placeholder*="Founder"]').fill(syntheticLead.role);
}

test.describe('public product journey', () => {
  test('landing and pricing controlled-access CTAs stay routable and localized', async ({ page }) => {
    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'landing');
    await expect(page.locator('#waitlist-form:visible')).toBeVisible();

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

  test('landing waitlist form has loading and success feedback with synthetic data', async ({ page }) => {
    await page.route('**/api/prelaunch', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ emailed: true, emailStatus: 'sent' }),
      });
    });

    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    await fillWaitlist(page);

    const submit = page.locator('#waitlist-form button[type="submit"]');
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(page.locator('#waitlist-form [role="status"]')).toContainText(/waitlist|lista de espera/i);
  });

  test('landing waitlist form shows controlled error feedback', async ({ page }) => {
    await page.route('**/api/prelaunch', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unable to process this synthetic request. Please try again.' }),
      });
    });

    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    await fillWaitlist(page);

    await page.locator('#waitlist-form button[type="submit"]').click();
    await expect(page.locator('#waitlist-form [role="status"], #waitlist-form [role="alert"]')).toContainText(
      /try again|erro|failed|problem|tentar|could not|unable|não foi|nao foi/i,
    );
    await expectHealthyDocument(page, 'waitlist controlled error');
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
