import { expect, test, type Page } from '@playwright/test';

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? '';
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? '';

const criticalRoutes = [
  '/en/dashboard',
  '/en/dashboard/organizations',
  '/en/ai-systems',
  '/en/aprovacoes',
  '/en/auditoria',
  '/en/security-center',
  '/en/vendor-assurance',
  '/en/document-generator',
  '/en/policy-pack',
  '/en/dashboard/organizations/templates',
  '/en/dashboard/organizations/reports-governance',
] as const;

async function signIn(page: Page) {
  await page.goto('/en/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill(OWNER_EMAIL);
  await page.getByLabel(/password/i).fill(OWNER_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|entrar/i }).click();
  await expect(page).not.toHaveURL(/\/en\/login(?:$|[?#])/);
}

test.describe('enterprise functional integrity', () => {
  test.beforeEach(() => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD for authenticated functional integrity checks.');
  });

  test('critical buyer-facing authenticated routes have one main landmark and no dead navigation', async ({ page }) => {
    await signIn(page);

    for (const route of criticalRoutes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), route).toBeLessThan(500);
      expect(response?.status(), route).not.toBe(404);

      await expect(page.locator('main'), `${route} must expose one canonical main landmark`).toHaveCount(1);

      const deadLinks = await page.locator('a').evaluateAll((anchors) =>
        anchors
          .filter((anchor) => {
            const element = anchor as HTMLAnchorElement;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((anchor) => (anchor as HTMLAnchorElement).getAttribute('href') ?? '')
          .filter((href) => !href || href === '#' || href.includes('/undefined') || /^javascript:/i.test(href)),
      );
      expect(deadLinks, `${route} contains dead visible links`).toEqual([]);

      const body = await page.locator('body').innerText();
      expect(body, `${route} exposes framework/runtime failure`).not.toMatch(
        /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|webpack-internal/i,
      );
    }
  });
});
