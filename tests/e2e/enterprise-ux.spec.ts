import { expect, test, type Page } from '@playwright/test';

const LOCALES = ['pt', 'en', 'es', 'fr', 'it', 'de'] as const;
type Locale = (typeof LOCALES)[number];

function localizedPath(locale: Locale, path: string) {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

function envName(persona: string, suffix: 'EMAIL' | 'PASSWORD') {
  return `E2E_${persona.toUpperCase().replace(/-/g, '_')}_${suffix}`;
}

function credentialsFor(persona: string) {
  return {
    email: process.env[envName(persona, 'EMAIL')] ?? '',
    password: process.env[envName(persona, 'PASSWORD')] ?? '',
  };
}

function skipWithoutCredentials(persona: string, credentials: { email: string; password: string }) {
  test.skip(
    !credentials.email || !credentials.password,
    `Set ${envName(persona, 'EMAIL')} and ${envName(persona, 'PASSWORD')} to run authenticated ${persona} enterprise UX checks.`,
  );
}

async function signIn(page: Page, locale: Locale, credentials: { email: string; password: string }) {
  await page.goto(localizedPath(locale, '/login'), { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password|palavra-passe|senha|contraseña|mot de passe|passwort/i).fill(credentials.password);
  await page.getByRole('button', { name: /sign in|entrar|connexion|accedi|anmelden/i }).click();
  await expect(page).not.toHaveURL(new RegExp(`/${locale}/login(?:$|[?#])`), { timeout: 15_000 });
}

async function expectNoTemplateSmell(page: Page, label: string) {
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 });

  expect(bodyText, `${label} contains lorem ipsum`).not.toMatch(/lorem ipsum/i);
  expect(bodyText, `${label} contains unresolved TODO copy`).not.toMatch(/TODO|FIXME|coming soon|placeholder/i);
  expect(bodyText, `${label} exposes a raw framework/runtime error`).not.toMatch(
    /Unhandled Runtime Error|Application error|Stack trace|ReferenceError:|TypeError:|SyntaxError:|webpack-internal/i,
  );
  expect(page.url(), `${label} navigated to /undefined`).not.toContain('/undefined');
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow, `${label} has horizontal overflow`).toBe(false);
}

test.describe('enterprise dashboard UX', () => {
  test('owner sees the executive overview, standardized states and working primary CTAs', async ({ page }) => {
    const credentials = credentialsFor('owner');
    skipWithoutCredentials('owner', credentials);

    await signIn(page, 'en', credentials);
    const response = await page.goto(localizedPath('en', '/dashboard'), { waitUntil: 'domcontentloaded' });

    expect(response?.status(), 'dashboard should not 404').not.toBe(404);
    expect(response?.status(), 'dashboard should not server-error').toBeLessThan(500);
    await expect(page.getByRole('heading', { name: /Executive compliance overview/i })).toBeVisible();
    await expect(page.getByText(/Compliance status/i)).toBeVisible();
    await expect(page.getByText(/Risk summary/i)).toBeVisible();
    await expect(page.getByText(/Pending tasks/i)).toBeVisible();
    await expect(page.getByText(/Document status/i)).toBeVisible();
    await expect(page.getByText(/Audit activity/i)).toBeVisible();
    await expect(page.getByText(/Billing status/i)).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /Success|Empty/i }).first()).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: /Error|Permission denied|Offline/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Open organizations/i })).toHaveAttribute('href', /\/en\/dashboard\/organizations/);
    await expect(page.getByRole('link', { name: /View documents/i })).toHaveAttribute('href', /\/en\/dashboard\/organizations\/documents/);
    await expectNoTemplateSmell(page, 'enterprise dashboard');
    await expectNoHorizontalOverflow(page, 'enterprise dashboard desktop');
  });

  test('dashboard copy exists for every supported locale', async ({ page }) => {
    const credentials = credentialsFor('owner');
    skipWithoutCredentials('owner', credentials);

    await signIn(page, 'en', credentials);

    for (const locale of LOCALES) {
      const response = await page.goto(localizedPath(locale, '/dashboard'), { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${locale} dashboard should not 404`).not.toBe(404);
      expect(response?.status(), `${locale} dashboard should not server-error`).toBeLessThan(500);
      await expect(page.getByRole('main')).toBeVisible();
      await expectNoTemplateSmell(page, `${locale} enterprise dashboard`);
    }
  });

  test('mobile dashboard keeps actions reachable without horizontal overflow', async ({ page }) => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true });
    const credentials = credentialsFor('owner');
    skipWithoutCredentials('owner', credentials);

    await signIn(page, 'en', credentials);
    await page.goto(localizedPath('en', '/dashboard'), { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Executive compliance overview/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open organizations/i })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'enterprise dashboard mobile');
  });
});

test.describe('basic visual smoke', () => {
  test('captures public home and authenticated enterprise dashboard screenshots', async ({ page }) => {
    const credentials = credentialsFor('owner');

    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expectNoTemplateSmell(page, 'public home visual smoke');
    await page.screenshot({ path: 'test-results/visual-smoke-home-en.png', fullPage: true });

    skipWithoutCredentials('owner', credentials);
    await signIn(page, 'en', credentials);
    await page.goto('/en/dashboard', { waitUntil: 'domcontentloaded' });
    await expectNoTemplateSmell(page, 'dashboard visual smoke');
    await page.screenshot({ path: 'test-results/visual-smoke-dashboard-en.png', fullPage: true });
  });
});
