import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const PUBLIC_LOCALES = ['en', 'pt', 'es', 'fr'] as const;
const GUARDED_LOCALES = ['en', 'pt'] as const;

type Locale = (typeof PUBLIC_LOCALES)[number];

type GuardedRoute = {
  area: string;
  path: string;
};

type ApiNegativeCase = {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
};

const guardedFeatureRoutes: GuardedRoute[] = [
  { area: 'onboarding', path: '/onboarding' },
  { area: 'dashboard organization', path: '/dashboard/organizations' },
  { area: 'documents', path: '/dashboard/organizations/documents' },
  { area: 'risks', path: '/dashboard/organizations/risks' },
  { area: 'vendors', path: '/vendor-assurance' },
  { area: 'AI systems inventory', path: '/ai-systems' },
  { area: 'AI incidents', path: '/ai-incidents' },
  { area: 'tasks and approvals', path: '/aprovacoes' },
  { area: 'team permissions', path: '/dashboard/organizations/team' },
  { area: 'billing', path: '/billing' },
  { area: 'organization billing', path: '/dashboard/organizations/billing' },
];

const publicRouteSmokePaths = ['/', '/login', '/signup', '/pricing'] as const;

const apiNegativeCases: ApiNegativeCase[] = [
  { name: 'AI systems list rejects anonymous access', method: 'GET', path: '/api/ai-systems' },
  {
    name: 'AI systems create rejects anonymous or untrusted mutation',
    method: 'POST',
    path: '/api/ai-systems',
    body: { name: 'x', useCase: 'too short' },
  },
  { name: 'AI incidents list rejects anonymous access', method: 'GET', path: '/api/ai-incidents' },
  {
    name: 'AI incidents create rejects anonymous or untrusted mutation',
    method: 'POST',
    path: '/api/ai-incidents',
    body: { title: 'x', summary: 'too short' },
  },
  {
    name: 'billing checkout rejects anonymous access before Stripe is reached',
    method: 'POST',
    path: '/api/billing/checkout',
    body: { plan: 'professional', locale: 'en' },
  },
  {
    name: 'document upload rejects untrusted anonymous mutation before storage is reached',
    method: 'POST',
    path: '/api/documents/upload',
    body: { file: 'not-a-file' },
  },
];

function localizedPath(locale: Locale | string, routePath: string) {
  return routePath === '/' ? `/${locale}` : `/${locale}${routePath}`;
}

async function expectControlledPage(page: Page, label: string) {
  await expect(page.locator('body'), `${label} should render a body`).toBeVisible();
  await expectNoRawFrameworkErrors(page, label);
  await expectNoUndefinedUrl(page, label);
  await expectNoUndefinedVisibleLinks(page, label);
}

async function expectNoRawFrameworkErrors(page: Page, label: string) {
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 });

  expect(bodyText, `${label} exposes a raw framework/server error`).not.toMatch(
    /Unhandled Runtime Error|Application error|Stack trace|ReferenceError:|TypeError:|SyntaxError:|webpack-internal|NEXT_REDIRECT|Invariant:/i,
  );
}

async function expectNoUndefinedUrl(page: Page, label: string) {
  expect(page.url(), `${label} navigated to /undefined`).not.toContain('/undefined');
}

async function expectNoUndefinedVisibleLinks(page: Page, label: string) {
  type LinkSnapshot = { href: string; text: string; visible: boolean };

  const badLinks = await page.locator('a[href]').evaluateAll((links): LinkSnapshot[] =>
    links
      .map((link) => {
        const anchor = link as HTMLAnchorElement;
        const rect = anchor.getBoundingClientRect();
        const style = window.getComputedStyle(anchor);

        return {
          href: anchor.getAttribute('href') ?? '',
          text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim(),
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
        };
      })
      .filter((link) => link.visible && link.href.includes('/undefined')),
  );

  expect(badLinks, `${label} has visible /undefined links`).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow, `${label} has horizontal overflow`).toBe(false);
}

async function requestNegativeCase(request: APIRequestContext, apiCase: ApiNegativeCase) {
  const response = await request.fetch(apiCase.path, {
    method: apiCase.method,
    data: apiCase.body,
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://attacker.example',
      Referer: 'https://attacker.example/poc',
    },
    failOnStatusCode: false,
  });

  const status = response.status();
  const body = await response.text();
  const cacheControl = response.headers()['cache-control'] ?? '';

  expect(status, `${apiCase.name} should not accidentally expose a missing route`).not.toBe(404);
  expect(status, `${apiCase.name} should reject unsafe input`).toBeGreaterThanOrEqual(400);
  expect(status, `${apiCase.name} should not crash`).toBeLessThan(500);
  expect(cacheControl, `${apiCase.name} should be no-store`).toContain('no-store');
  expect(body, `${apiCase.name} should not leak stack traces or secrets`).not.toMatch(
    /SUPABASE_SERVICE_ROLE|STRIPE_SECRET|CLERK_SECRET|NEXT_PUBLIC_SUPABASE|Stack trace|webpack-internal|ReferenceError:|TypeError:/i,
  );
}

test.describe('enterprise critical SaaS flow coverage', () => {
  for (const locale of PUBLIC_LOCALES) {
    for (const routePath of publicRouteSmokePaths) {
      test(`${locale} public ${routePath} renders without framework errors or undefined links`, async ({ page }) => {
        const target = localizedPath(locale, routePath);
        const response = await page.goto(target, { waitUntil: 'domcontentloaded' });

        expect(response?.status(), `${target} should not 404`).not.toBe(404);
        expect(response?.status(), `${target} should not server-error`).toBeLessThan(500);
        await expectControlledPage(page, `${locale} public ${routePath}`);
      });
    }
  }

  for (const locale of GUARDED_LOCALES) {
    for (const route of guardedFeatureRoutes) {
      test(`${locale} ${route.area} redirects anonymous visitors to localized login`, async ({ page }) => {
        const target = localizedPath(locale, route.path);
        const response = await page.goto(target, { waitUntil: 'domcontentloaded' });
        const currentUrl = new URL(page.url());

        expect(response?.status(), `${route.area} should not server-error`).toBeLessThan(500);
        expect(currentUrl.pathname, `${route.area} should redirect to the localized login page`).toBe(`/${locale}/login`);
        expect(currentUrl.searchParams.get('next') ?? '', `${route.area} should preserve next`).toContain(target);
        await expectControlledPage(page, `${locale} guarded ${route.area}`);
      });
    }
  }

  test('landing exposes real conversion destinations without fake production or legal claims', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expectControlledPage(page, 'en landing trust copy');

    const conversionLinks = page.locator('a[href*="/en/signup"], a[href*="/en/billing"], a[href*="/en/contact"], a[href*="/en/pricing"]');
    expect(await conversionLinks.count(), 'landing should expose several conversion links with real hrefs').toBeGreaterThanOrEqual(3);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText, 'landing should not make absolute compliance guarantees').not.toMatch(
      /100%\s+(?:EU AI Act\s+)?compliant|guaranteed\s+(?:EU AI Act\s+)?compliance|officially\s+(?:EU\s+)?approved|certified\s+(?:EU AI Act\s+)?compliance|replaces\s+(?:legal counsel|lawyers?)/i,
    );
  });

  test('mobile public conversion routes have no horizontal overflow or raw errors', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const routePath of publicRouteSmokePaths) {
      const target = localizedPath('pt', routePath);
      const response = await page.goto(target, { waitUntil: 'domcontentloaded' });

      expect(response?.status(), `${target} should not 404 on mobile`).not.toBe(404);
      expect(response?.status(), `${target} should not server-error on mobile`).toBeLessThan(500);
      await expectControlledPage(page, `mobile pt ${routePath}`);
      await expectNoHorizontalOverflow(page, `mobile pt ${routePath}`);
    }
  });

  test('critical API negative cases are controlled and do not require real credentials', async ({ request }) => {
    for (const apiCase of apiNegativeCases) {
      await requestNegativeCase(request, apiCase);
    }
  });
});
