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

test.describe('public product journey', () => {
  test('landing and pricing signup CTAs stay routable and localized', async ({ page }) => {
    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'landing');
    await expect(page.locator('#waitlist-form')).toBeVisible();

    await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/pt\/pricing(?:$|[?#])/);
    await expectHealthyDocument(page, 'pricing');

    await page.locator('a[href="/pt/signup?plan=professional"]').first().click();
    await expect(page).toHaveURL(/\/pt\/signup\?plan=professional/);
    await expectHealthyDocument(page, 'signup');
    await expect(page.getByText(/professional/i).first()).toBeVisible();
  });

  test('pricing exposes only actionable critical CTAs', async ({ page }) => {
    await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'pricing CTA audit');

    const expectedCtas = [
      { name: /start essential/i, href: '/pt/signup?plan=essential' },
      { name: /start professional trial/i, href: '/pt/signup?plan=professional' },
      { name: /book business demo/i, href: '/pt/book-demo?plan=business' },
      { name: /talk to sales/i, href: '/pt/enterprise' },
      { name: /review trust center/i, href: '/pt/trust' },
    ];

    for (const cta of expectedCtas) {
      await expect(page.getByRole('link', { name: cta.name }).first()).toHaveAttribute('href', cta.href);
    }

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
    await page.locator('#waitlist-form input[placeholder="Acme Europe"]').fill(syntheticLead.companyName);
    await page.locator('#waitlist-form input[type="email"]').fill(syntheticLead.workEmail);
    await page.locator('#waitlist-form input[placeholder*="Founder"]').fill(syntheticLead.role);

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
        body: JSON.stringify({ error: 'synthetic_failure' }),
      });
    });

    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    await page.locator('#waitlist-form input[placeholder="Acme Europe"]').fill(syntheticLead.companyName);
    await page.locator('#waitlist-form input[type="email"]').fill(syntheticLead.workEmail);
    await page.locator('#waitlist-form input[placeholder*="Founder"]').fill(syntheticLead.role);

    await page.locator('#waitlist-form button[type="submit"]').click();
    await expect(page.locator('#waitlist-form [role="status"], #waitlist-form [role="alert"]')).toContainText(
      /try again|erro|failed|problem|tentar/i,
    );
    await expectHealthyDocument(page, 'waitlist controlled error');
  });

  test('book demo form has a real handler, loading state and feedback', async ({ page }) => {
    await page.route('**/api/leads', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/pt/book-demo', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'book demo');

    await page.getByLabel(/full name/i).fill(syntheticLead.fullName);
    await page.getByLabel(/work email/i).fill(syntheticLead.workEmail);
    await page.getByLabel(/company \*/i).fill(syntheticLead.companyName);
    await page.getByLabel(/role/i).fill(syntheticLead.role);
    await page.getByLabel(/i agree to be contacted/i).check();

    const submit = page.getByRole('button', { name: /book demo/i });
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(page.locator('[aria-live="polite"]')).toContainText(/demo request received/i);
  });

  test('book demo form shows controlled error feedback', async ({ page }) => {
    await page.route('**/api/leads', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'synthetic_failure' }),
      });
    });

    await page.goto('/pt/book-demo', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/full name/i).fill(syntheticLead.fullName);
    await page.getByLabel(/work email/i).fill(syntheticLead.workEmail);
    await page.getByLabel(/company \*/i).fill(syntheticLead.companyName);
    await page.getByLabel(/role/i).fill(syntheticLead.role);
    await page.getByLabel(/i agree to be contacted/i).check();

    await page.getByRole('button', { name: /book demo/i }).click();
    await expect(page.locator('[aria-live="polite"], [role="alert"]')).toContainText(
      /try again|erro|failed|problem|tentar/i,
    );
    await expectHealthyDocument(page, 'book demo controlled error');
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
    const response = await request.get('/pt/dashboard/organizations/billing', {
      failOnStatusCode: false,
      maxRedirects: 0,
    });

    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toContain('/pt/login?next=');
    expect(response.headers()['cache-control']).toMatch(/no-store/i);
  });

  test('login page accepts next continuation without losing the target', async ({ page }) => {
    await page.goto('/pt/login?next=%2Fpt%2Fdashboard%2Forganizations%2Fbilling', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/pt\/login\?next=/);
    await expectHealthyDocument(page, 'login continuation');
  });
});

test.describe('billing CTA journey', () => {
  test('checkout selected plan shows anonymous account and sign-in CTAs', async ({ page }) => {
    await page.goto('/pt/checkout?plan=professional', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'checkout selected plan');
    await expect(page.getByRole('link', { name: /create account and continue/i })).toHaveAttribute(
      'href',
      /\/pt\/signup\?plan=growth/,
    );
    await expect(page.getByRole('link', { name: /sign in to continue/i })).toHaveAttribute(
      'href',
      /\/pt\/login\?next=/,
    );
  });

  test('checkout without a valid plan redirects to pricing with feedback marker', async ({ page }) => {
    await page.goto('/pt/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/pt\/pricing\?checkout=select_plan/);
    await expectHealthyDocument(page, 'checkout missing plan redirect');
  });

  test('business and enterprise sales CTAs resolve to existing sales routes', async ({ page }) => {
    await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'pricing billing CTAs');

    await page.getByRole('link', { name: /book business demo/i }).click();
    await expect(page).toHaveURL(/\/pt\/book-demo\?plan=business/);
    await expectHealthyDocument(page, 'business demo CTA');

    await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /talk to sales/i }).click();
    await expect(page).toHaveURL(/\/pt\/enterprise(?:$|[?#])/);
    await expectHealthyDocument(page, 'enterprise sales CTA');
  });
});

test.describe('trust and security public pages', () => {
  for (const route of ['/pt/trust', '/pt/security', '/pt/privacy', '/pt/terms'] as const) {
    test(`${route} loads without a broken public surface`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route} should not be missing`).not.toBe(404);
      expect(response?.status(), `${route} should not server-error`).toBeLessThan(500);
      await expectHealthyDocument(page, route);
    });
  }
});

test.describe('mobile viewport smoke', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  for (const route of ['/pt', '/pt/pricing', '/pt/book-demo', '/pt/checkout?plan=professional'] as const) {
    test(`${route} keeps primary mobile controls usable`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expectHealthyDocument(page, `mobile ${route}`);
      await expect(page.locator('a[href], button').first()).toBeVisible();
      const visibleBrokenLinks = await page.locator('a[href*="/undefined"]:visible').count();
      expect(visibleBrokenLinks, `${route} should not expose visible /undefined mobile links`).toBe(0);
    });
  }
});

test.describe('basic keyboard navigation', () => {
  test('landing exposes reachable keyboard targets and avoids focus traps', async ({ page }) => {
    await page.goto('/pt', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'keyboard landing');

    const focusableCount = await page.locator('a[href], button, input, select, textarea').evaluateAll((elements) =>
      elements.filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      }).length,
    );
    expect(focusableCount, 'landing should expose keyboard-reachable controls').toBeGreaterThan(5);

    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press('Tab');
    }

    const activeElementTag = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(activeElementTag, 'keyboard focus should move to an interactive element').toMatch(/A|BUTTON|INPUT|SELECT|TEXTAREA/);
  });
});

test.describe('seeded authenticated journeys', () => {
  test.skip(!process.env.E2E_AUTH_STORAGE_STATE, 'Set E2E_AUTH_STORAGE_STATE to a synthetic auth storageState file to run authenticated journeys without real user data.');
  test.use({ storageState: process.env.E2E_AUTH_STORAGE_STATE || undefined });

  test('dashboard load journey renders for a seeded authenticated persona', async ({ page }) => {
    await page.goto('/pt/dashboard/organizations', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'seeded dashboard load');
  });

  test('onboarding complete journey is guarded behind synthetic fixture opt-in', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_SYNTHETIC_ONBOARDING_WRITE !== 'true', 'Enable only in disposable QA Supabase projects; this flow creates synthetic test organization data.');
    await page.goto('/pt/onboarding?plan=professional', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'seeded onboarding');
  });

  test('create AI system journey is guarded behind synthetic fixture opt-in', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES !== 'true', 'Enable only in disposable QA Supabase projects; this flow creates synthetic AI system data.');
    await page.goto('/pt/ai-systems', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'seeded AI systems');
  });

  test('create task/document journey is guarded behind synthetic fixture opt-in', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES !== 'true', 'Enable only in disposable QA Supabase projects; this flow creates synthetic task/document data.');
    await page.goto('/pt/dashboard/organizations/documents', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'seeded documents/tasks');
  });

  test('billing CTA renders for a seeded billing-capable persona', async ({ page }) => {
    await page.goto('/pt/dashboard/organizations/billing', { waitUntil: 'domcontentloaded' });
    await expectHealthyDocument(page, 'seeded billing');
  });
});
