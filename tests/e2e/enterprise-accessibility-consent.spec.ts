import { expect, test, type Page } from '@playwright/test';

const CONSENT_STORAGE_KEY = 'risckcomply.analytics.consent';
const POSTHOG_SCRIPT_ID = 'posthog-js-sdk';
const LEGACY_POSTHOG_SCRIPT_ID = 'posthog-init';
const PUBLIC_ROUTES = ['/en', '/en/pricing', '/en/login'] as const;
const POSTHOG_REQUEST_HOSTS = new Set([
  'analytics-ci.invalid',
  'eu.i.posthog.com',
  'eu-assets.i.posthog.com',
]);

function isPostHogRequest(rawUrl: string) {
  return POSTHOG_REQUEST_HOSTS.has(new URL(rawUrl).hostname);
}

async function startWithAnalyticsDenied(page: Page) {
  await page.addInitScript((key) => window.localStorage.setItem(key, 'denied'), CONSENT_STORAGE_KEY);
}

async function focusConsentPolicyLink(page: Page) {
  await page.keyboard.press('Tab');
  const policyLink = page.getByRole('link', { name: 'Cookie Policy and settings' });
  await expect(policyLink).toBeFocused();
  await expect(policyLink).toHaveAttribute('href', '/en/cookie-policy');
}

async function semanticAudit(page: Page) {
  return page.evaluate(() => {
    const isVisible = (element: Element) => {
      const htmlElement = element as HTMLElement;
      const style = window.getComputedStyle(htmlElement);
      const rect = htmlElement.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    const labelledText = (element: Element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (!labelledBy) return '';
      return labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
    };

    const accessibleName = (element: Element) => {
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        const labels = Array.from(element.labels ?? []).map((label) => label.textContent?.trim() ?? '').filter(Boolean);
        return labels.join(' ') || element.getAttribute('aria-label') || labelledText(element) || '';
      }

      return element.getAttribute('aria-label')
        || labelledText(element)
        || element.getAttribute('title')
        || element.textContent?.replace(/\s+/g, ' ').trim()
        || '';
    };

    const ids = Array.from(document.querySelectorAll<HTMLElement>('[id]')).map((element) => element.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const ariaReferences = Array.from(document.querySelectorAll<HTMLElement>('[aria-labelledby], [aria-describedby]'));
    const invalidAriaReferences = ariaReferences.flatMap((element) =>
      ['aria-labelledby', 'aria-describedby'].flatMap((attribute) =>
        (element.getAttribute(attribute) ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .filter((id) => !document.getElementById(id))
          .map((id) => `${attribute}:${id}`),
      ),
    );

    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"]'),
    ).filter(isVisible);
    const unnamedInteractive = interactive
      .filter((element) => !accessibleName(element))
      .map((element) => element.outerHTML.slice(0, 180));

    const formControls = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type="hidden"]), select, textarea'),
    ).filter(isVisible);
    const unlabeledControls = formControls
      .filter((element) => !accessibleName(element))
      .map((element) => element.outerHTML.slice(0, 180));

    const imagesMissingAlt = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
      .filter((image) => !image.hasAttribute('alt'))
      .map((image) => image.outerHTML.slice(0, 180));

    const exposedMainLandmarks = Array.from(
      document.querySelectorAll<HTMLElement>('main, [role="main"]'),
    )
      .filter(isVisible)
      .filter((element) => !element.closest('[aria-hidden="true"], [inert]'));

    return {
      mainCount: exposedMainLandmarks.length,
      h1Count: document.querySelectorAll('h1').length,
      duplicateIds: [...new Set(duplicateIds)],
      invalidAriaReferences: [...new Set(invalidAriaReferences)],
      unnamedInteractive,
      unlabeledControls,
      imagesMissingAlt,
    };
  });
}

test.describe('enterprise accessibility and analytics consent acceptance', () => {
  test('keyboard-only navigation reaches critical controls', async ({ page }) => {
    await startWithAnalyticsDenied(page);

    for (const route of PUBLIC_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const visited = new Set<string>();

      for (let index = 0; index < 24; index += 1) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          if (!active) return null;
          const label = active.getAttribute('aria-label')
            || active.textContent?.replace(/\s+/g, ' ').trim()
            || active.getAttribute('name')
            || active.getAttribute('type')
            || '';
          return {
            key: `${active.tagName}:${active.id}:${label}`,
            interactive: active.matches('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
          };
        });

        if (focus?.interactive) visited.add(focus.key);
      }

      expect(visited.size, `${route} should expose a useful keyboard tab sequence`).toBeGreaterThanOrEqual(3);
    }
  });

  test('semantic landmarks and accessible names support screen readers', async ({ page }) => {
    await startWithAnalyticsDenied(page);

    for (const route of PUBLIC_ROUTES) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator('main:visible, [role="main"]:visible').first()).toBeVisible();
      const audit = await semanticAudit(page);

      expect(audit.mainCount, `${route} should expose one main landmark`).toBe(1);
      expect(audit.h1Count, `${route} should expose a primary heading`).toBeGreaterThanOrEqual(1);
      expect(audit.duplicateIds, `${route} should not contain duplicate ids`).toEqual([]);
      expect(audit.invalidAriaReferences, `${route} should not contain broken aria references`).toEqual([]);
      expect(audit.unnamedInteractive, `${route} interactive controls need accessible names`).toEqual([]);
      expect(audit.unlabeledControls, `${route} form controls need programmatic labels`).toEqual([]);
      expect(audit.imagesMissingAlt, `${route} images need explicit alt attributes`).toEqual([]);
    }
  });

  test.describe('analytics consent runtime boundary', () => {
    test.skip(
      process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT !== 'true' || !process.env.NEXT_PUBLIC_POSTHOG_KEY,
      'The protected Full Security Suite enables the synthetic analytics runtime configuration.',
    );

    test('analytics stays blocked before consent and decline persists', async ({ page }) => {
      let analyticsRequests = 0;
      page.on('request', (request) => {
        if (isPostHogRequest(request.url())) analyticsRequests += 1;
      });

      await page.goto('/en', { waitUntil: 'domcontentloaded' });
      const dialog = page.getByRole('dialog', { name: /privacy-first product analytics/i });
      await expect(dialog).toBeVisible();
      await expect(dialog).toBeFocused();
      await expect(page.locator(`#${POSTHOG_SCRIPT_ID}`)).toHaveCount(0);
      await expect(page.locator(`#${LEGACY_POSTHOG_SCRIPT_ID}`)).toHaveCount(0);
      expect(analyticsRequests).toBe(0);

      await focusConsentPolicyLink(page);
      await page.keyboard.press('Tab');
      const decline = page.getByRole('button', { name: 'Decline' });
      await expect(decline).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(dialog).toBeHidden();
      await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), CONSENT_STORAGE_KEY)).toBe('denied');
      await expect(page.locator(`#${POSTHOG_SCRIPT_ID}`)).toHaveCount(0);
      expect(analyticsRequests).toBe(0);
    });

    test('analytics loads only after explicit consent', async ({ page }) => {
      let analyticsRequests = 0;
      await page.route(/^https:\/\/eu-assets\.i\.posthog\.com\/static\/array\.js(?:\?.*)?$/, async (route) => {
        analyticsRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'window.posthog = window.posthog || [];',
        });
      });

      await page.goto('/en', { waitUntil: 'domcontentloaded' });
      const dialog = page.getByRole('dialog', { name: /privacy-first product analytics/i });
      await expect(dialog).toBeFocused();
      await expect(page.locator(`#${POSTHOG_SCRIPT_ID}`)).toHaveCount(0);
      await expect(page.locator(`#${LEGACY_POSTHOG_SCRIPT_ID}`)).toHaveCount(0);

      await focusConsentPolicyLink(page);
      await page.keyboard.press('Tab');
      const decline = page.getByRole('button', { name: 'Decline' });
      await expect(decline).toBeFocused();
      await page.keyboard.press('Tab');
      const allow = page.getByRole('button', { name: 'Allow' });
      await expect(allow).toBeFocused();
      await page.keyboard.press('Enter');

      await expect.poll(() => analyticsRequests).toBeGreaterThan(0);
      await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), CONSENT_STORAGE_KEY)).toBe('granted');
      await expect(page.locator(`#${POSTHOG_SCRIPT_ID}`)).toHaveCount(1);
    });
  });
});
