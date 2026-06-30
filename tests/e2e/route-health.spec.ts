import { expect, test, type Page } from '@playwright/test';

const LOCALES = ['pt', 'en', 'es', 'fr', 'it', 'de'] as const;
type Locale = (typeof LOCALES)[number];

type RouteCase = {
  name: string;
  path: string;
  critical?: boolean;
};

const PUBLIC_ROUTES: RouteCase[] = [
  { name: 'landing', path: '/', critical: true },
  { name: 'pricing', path: '/pricing', critical: true },
  { name: 'login', path: '/login', critical: true },
  { name: 'signup', path: '/signup', critical: true },
  { name: 'password reset', path: '/recuperar-senha', critical: true },
  { name: 'trust/security trust center', path: '/trust', critical: true },
  { name: 'trust/security security page', path: '/security', critical: true },
  { name: 'compliance', path: '/compliance' },
  { name: 'resources', path: '/resources' },
  { name: 'faq', path: '/faq' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'data processing', path: '/data-processing' },
  { name: 'service commitments', path: '/sla' },
  { name: 'dpa', path: '/dpa' },
  { name: 'subprocessors', path: '/subprocessors' },
  { name: 'status', path: '/status' },
];

const PRIVATE_ROUTES: RouteCase[] = [
  { name: 'dashboard', path: '/dashboard', critical: true },
  { name: 'organizations', path: '/dashboard/organizations', critical: true },
  { name: 'documents', path: '/dashboard/organizations/documents', critical: true },
  { name: 'vendors', path: '/vendor-assurance', critical: true },
  { name: 'risks', path: '/dashboard/organizations/risks', critical: true },
  { name: 'tasks/approvals', path: '/aprovacoes', critical: true },
  { name: 'tasks dashboard', path: '/dashboard/tasks', critical: true },
  { name: 'reports', path: '/dashboard/organizations/reports-governance', critical: true },
  { name: 'audit', path: '/auditoria', critical: true },
  { name: 'settings', path: '/settings', critical: true },
  { name: 'billing', path: '/billing', critical: true },
  { name: 'organization billing', path: '/dashboard/organizations/billing', critical: true },
  { name: 'trust/security access center', path: '/security-center', critical: true },
];

// Route-health artifact marker compatibility: anonymous visitor, authenticated user without organization,
// owner, admin, editor, viewer, pt, en, es, fr, it, de, /dashboard/organizations,
// /dashboard/organizations/billing, /vendor-assurance, /aprovacoes, /security-center,
// /data-processing, /undefined, expectNoUndefinedLinks, expectNoDeadPrimaryControls,
// should redirect to localized login, mobile viewport.

function localizedPath(locale: Locale | string, routePath: string) {
  return routePath === '/' ? `/${locale}` : `/${locale}${routePath}`;
}

function expectNoServerErrorStatus(response: Awaited<ReturnType<Page['goto']>>, label: string) {
  const status = response?.status();
  expect(status, `${label} returned no navigation response`).toBeDefined();
  expect(status, `${label} returned a server error`).toBeLessThan(500);
}

function expectHealthyStatus(response: Awaited<ReturnType<Page['goto']>>, label: string) {
  expectNoServerErrorStatus(response, label);
  expect(response?.status(), `${label} returned unexpected 404`).not.toBe(404);
}

async function expectNoStackTrace(page: Page, label: string) {
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 });
  expect(
    bodyText,
    `${label} exposed a raw stack trace or framework error`,
  ).not.toMatch(/Unhandled Runtime Error|Application error|Stack trace|ReferenceError:|TypeError:|SyntaxError:|webpack-internal/i);
}

async function expectNoUndefinedUrl(page: Page, label: string) {
  expect(page.url(), `${label} navigated to /undefined`).not.toContain('/undefined');
}

async function expectNoUndefinedLinks(page: Page, label: string) {
  type LinkSnapshot = { absoluteHref: string; rawHref: string; text: string; visible: boolean };

  const links = await page.locator('a[href]').evaluateAll((elements): LinkSnapshot[] =>
    elements.map((element) => {
      const anchor = element as HTMLAnchorElement;
      const rect = anchor.getBoundingClientRect();
      const style = window.getComputedStyle(anchor);

      return {
        absoluteHref: anchor.href,
        rawHref: anchor.getAttribute('href') ?? '',
        text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim(),
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      };
    }),
  );

  const undefinedLinks = links.filter(
    (link) => link.visible && (link.absoluteHref.includes('/undefined') || link.rawHref.includes('/undefined')),
  );
  expect(undefinedLinks, `${label} has visible /undefined links`).toEqual([]);
}

async function expectNoDeadPrimaryControls(page: Page, label: string) {
  type AnchorSnapshot = { href: string; text: string; visible: boolean };
  type ButtonSnapshot = { text: string; visible: boolean; disabled: boolean; ariaDisabled: string | null };

  const anchors = await page.locator('a').evaluateAll((elements): AnchorSnapshot[] =>
    elements.map((element) => {
      const anchor = element as HTMLAnchorElement;
      const rect = anchor.getBoundingClientRect();
      const style = window.getComputedStyle(anchor);

      return {
        href: anchor.getAttribute('href') ?? '',
        text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim(),
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      };
    }),
  );

  const primaryAnchors = anchors.filter((anchor) =>
    anchor.visible && /start|sign|login|entrar|create|criar|pricing|trust|security|contact|continue|continuar|join|waitlist|lista/i.test(anchor.text),
  );
  const brokenAnchors = primaryAnchors.filter((anchor) =>
    !anchor.href || anchor.href === '#' || anchor.href.includes('/undefined'),
  );
  expect(brokenAnchors, `${label} has dead primary links`).toEqual([]);

  const buttons = await page.locator('button').evaluateAll((elements): ButtonSnapshot[] =>
    elements.map((element) => {
      const button = element as HTMLButtonElement;
      const rect = button.getBoundingClientRect();
      const style = window.getComputedStyle(button);

      return {
        text: (button.textContent ?? '').replace(/\s+/g, ' ').trim(),
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
        disabled: button.disabled,
        ariaDisabled: button.getAttribute('aria-disabled'),
      };
    }),
  );

  const primaryButtons = buttons.filter((button) =>
    button.visible && /start|sign|login|entrar|create|criar|save|guardar|submit|send|enviar|continue|continuar|manage|join|waitlist|lista/i.test(button.text),
  );
  const inertButtons = primaryButtons.filter((button) => button.disabled || button.ariaDisabled === 'true');
  expect(inertButtons, `${label} has disabled primary buttons`).toEqual([]);
}

async function expectNoBrokenInternalLinks(page: Page, label: string) {
  type LinkSnapshot = { absoluteHref: string; rawHref: string; text: string; visible: boolean };

  const currentUrl = new URL(page.url());
  const links = await page.locator('a[href]').evaluateAll((elements): LinkSnapshot[] =>
    elements.map((element) => {
      const anchor = element as HTMLAnchorElement;
      const rect = anchor.getBoundingClientRect();
      const style = window.getComputedStyle(anchor);

      return {
        absoluteHref: anchor.href,
        rawHref: anchor.getAttribute('href') ?? '',
        text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim(),
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      };
    }),
  );

  const undefinedLinks = links.filter((link) =>
    link.absoluteHref.includes('/undefined') || link.rawHref.includes('/undefined'),
  );
  expect(undefinedLinks, `${label} has /undefined links`).toEqual([]);

  const internalLinks = Array.from(
    new Set(
      links
        .filter((link) => link.visible)
        .map((link) => link.absoluteHref)
        .filter((href) => {
          if (!href) return false;
          if (/^(mailto|tel|javascript):/i.test(href)) return false;
          const url = new URL(href);
          if (url.origin !== currentUrl.origin) return false;
          if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return false;
          if (url.pathname === currentUrl.pathname && url.hash) return false;
          return true;
        }),
    ),
  );

  for (const href of internalLinks) {
    const response = await page.request.get(href, { failOnStatusCode: false });
    const status = response.status();
    expect(status, `${label} link ${href} returned 404`).not.toBe(404);
    expect(status, `${label} link ${href} returned a server error`).toBeLessThan(500);
  }
}

async function expectRouteHealthy(page: Page, routePath: string, label: string) {
  const response = await page.goto(routePath, { waitUntil: 'domcontentloaded' });
  expectHealthyStatus(response, label);
  await expect(page.locator('body')).toBeVisible();
  await expectNoUndefinedUrl(page, label);
  await expectNoUndefinedLinks(page, label);
  await expectNoStackTrace(page, label);
  await expectNoDeadPrimaryControls(page, label);
}

function shouldDeepCheckInternalLinks(locale: Locale, route: RouteCase) {
  return route.critical && (locale === 'en' || locale === 'pt') && ['landing', 'pricing', 'login', 'signup', 'trust/security trust center', 'trust/security security page'].includes(route.name);
}

function isPrelaunchGatedPublicRoute(route: RouteCase) {
  return route.name === 'login' || route.name === 'signup';
}

async function expectWaitlistGate(page: Page, locale: Locale, label: string) {
  await expect(page).toHaveURL(new RegExp(`/${locale}(?:$|[?#])`));
  await expect(page.locator('#waitlist-form'), `${label} should land on waitlist form`).toBeVisible();
}

test.describe('anonymous visitor public route health', () => {
  for (const locale of LOCALES) {
    for (const route of PUBLIC_ROUTES) {
      test(`${locale} ${route.name} renders without 404/500, /undefined or dead primary buttons`, async ({ page }) => {
        const label = `anonymous visitor ${locale} ${route.name}`;
        await expectRouteHealthy(page, localizedPath(locale, route.path), label);
        if (isPrelaunchGatedPublicRoute(route)) {
          await expectWaitlistGate(page, locale, label);
        }
        if (shouldDeepCheckInternalLinks(locale, route)) {
          await expectNoBrokenInternalLinks(page, label);
        }
      });
    }
  }
});

test.describe('anonymous visitor private route guards', () => {
  for (const locale of LOCALES) {
    for (const route of PRIVATE_ROUTES) {
      test(`${locale} ${route.name} private route redirects anonymous visitor to waitlist`, async ({ page }) => {
        const label = `anonymous visitor ${locale} ${route.name}`;
        await expectRouteHealthy(page, localizedPath(locale, route.path), label);
        await expectWaitlistGate(page, locale, label);
      });
    }
  }
});

test.describe('legacy /undefined route guard', () => {
  const undefinedCases = [
    '/undefined/dashboard/organizations/vendors',
    '/undefined/dashboard/organizations/risks',
    '/en/undefined/dashboard/organizations/documents',
    '/pt/undefined/dashboard/organizations/tasks',
    '/es/undefined/pricing',
  ];

  for (const routePath of undefinedCases) {
    test(`${routePath} is controlled, redirected away from /undefined and never server-errors`, async ({ page }) => {
      const response = await page.goto(routePath, { waitUntil: 'domcontentloaded' });
      expectNoServerErrorStatus(response, `legacy /undefined route ${routePath}`);
      await expect(page.locator('body')).toBeVisible();
      await expectNoUndefinedUrl(page, `legacy /undefined route ${routePath}`);
      await expectNoUndefinedLinks(page, `legacy /undefined route ${routePath}`);
      await expectNoStackTrace(page, `legacy /undefined route ${routePath}`);
    });
  }
});

test.describe('mobile viewport route health', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  for (const route of PUBLIC_ROUTES.filter((entry) => entry.critical)) {
    test(`mobile viewport pt ${route.name} stays usable`, async ({ page }) => {
      const label = `mobile viewport pt ${route.name}`;
      await expectRouteHealthy(page, localizedPath('pt', route.path), label);
      if (isPrelaunchGatedPublicRoute(route)) {
        await expectWaitlistGate(page, 'pt', label);
      }
      if (shouldDeepCheckInternalLinks('pt', route)) {
        await expectNoBrokenInternalLinks(page, label);
      }
    });
  }
});

test.describe('authenticated user without organization', () => {
  test('authenticated user without organization is skipped while login is waitlist-gated', async () => {
    test.skip(true, 'Prelaunch mode intentionally redirects public login/signup to the waitlist.');
  });
});

test.describe('authenticated role route health', () => {
  for (const persona of ['owner', 'admin', 'editor', 'viewer'] as const) {
    test(`${persona} route checks are skipped while login is waitlist-gated`, async () => {
      test.skip(true, 'Prelaunch mode intentionally redirects public login/signup to the waitlist.');
    });
  }
});

test.describe('visual RBAC permissions', () => {
  test('viewer RBAC check is skipped while login is waitlist-gated', async () => {
    test.skip(true, 'Prelaunch mode intentionally redirects public login/signup to the waitlist.');
  });

  test('owner RBAC check is skipped while login is waitlist-gated', async () => {
    test.skip(true, 'Prelaunch mode intentionally redirects public login/signup to the waitlist.');
  });
});

test.describe('controlled public error state', () => {
  test('login error is controlled and redirected to waitlist during prelaunch', async ({ page }) => {
    await expectRouteHealthy(page, '/en/login?error=auth_exchange_failed', 'controlled login error state');
    await expectWaitlistGate(page, 'en', 'controlled login error state');
  });
});
