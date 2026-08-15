import { expect, test, type Page } from '@playwright/test';

async function expectHealthyDocument(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not show Next.js/runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should never navigate to /undefined`).not.toContain('/undefined');
}

const localizedJourney = [
  { locale: 'pt', pricing: /Comece pela preparação de IA/i, checkout: /Ative o seu workspace RISCK COMPLY/i, login: /Entrar na RISCK COMPLY/i, signup: /Criar conta RISCK COMPLY/i },
  { locale: 'es', pricing: /Empieza con preparación de IA/i, checkout: /Activa tu workspace RISCK COMPLY/i, login: /Inicia sesión en RISCK COMPLY/i, signup: /Crea tu cuenta RISCK COMPLY/i },
  { locale: 'fr', pricing: /Commencez par la préparation IA/i, checkout: /Activez votre workspace RISCK COMPLY/i, login: /Se connecter à RISCK COMPLY/i, signup: /Créez votre compte RISCK COMPLY/i },
  { locale: 'it', pricing: /Inizia dalla preparazione IA/i, checkout: /Attiva il tuo workspace RISCK COMPLY/i, login: /Accedi a RISCK COMPLY/i, signup: /Crea il tuo account RISCK COMPLY/i },
  { locale: 'de', pricing: /Starten Sie mit KI-Readiness/i, checkout: /Aktivieren Sie Ihren RISCK COMPLY Workspace/i, login: /Bei RISCK COMPLY anmelden/i, signup: /RISCK COMPLY Konto erstellen/i },
] as const;

const commercialRoutes = ['/pt/pricing', '/pt/checkout?plan=professional', '/pt/login', '/pt/signup?plan=professional'] as const;

async function expectNoDocumentOverflow(page: Page, route: string, label: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expectHealthyDocument(page, `${label} ${route}`);
  const overflowsViewport = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflowsViewport, `${route} should not overflow the ${label} viewport`).toBe(false);
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
    await expect(page.getByRole('link', { name: /iniciar|começar|demo|vendas/i }).first()).toBeVisible();
  });

  for (const localeCase of localizedJourney) {
    test(`${localeCase.locale} keeps pricing, checkout, login and signup in the selected locale`, async ({ page }) => {
      await page.goto(`/${localeCase.locale}/pricing`, { waitUntil: 'domcontentloaded' });
      await expectHealthyDocument(page, `${localeCase.locale} pricing`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(localeCase.pricing);

      await page.goto(`/${localeCase.locale}/checkout?plan=professional`, { waitUntil: 'domcontentloaded' });
      await expectHealthyDocument(page, `${localeCase.locale} checkout`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(localeCase.checkout);

      await page.goto(`/${localeCase.locale}/login`, { waitUntil: 'domcontentloaded' });
      await expectHealthyDocument(page, `${localeCase.locale} login`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(localeCase.login);

      await page.goto(`/${localeCase.locale}/signup?plan=professional`, { waitUntil: 'domcontentloaded' });
      await expectHealthyDocument(page, `${localeCase.locale} signup`);
      await expect(page.locator('body')).toContainText(localeCase.signup);
    });
  }

  test('pricing exposes only actionable critical CTAs', async ({ page }) => {
    await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
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
