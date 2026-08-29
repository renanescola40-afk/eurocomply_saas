import { expect, test } from '@playwright/test';

test.describe('enterprise production gate smoke', () => {
  test('serves the public access surface without framework error leakage', async ({ page }) => {
    const response = await page.goto('/pt', { waitUntil: 'domcontentloaded' });

    expect(response?.status() ?? 0).toBeLessThan(500);

    const body = page.locator('body');
    await expect(body).toContainText(/RISCK COMPLY|governança|governance|compliance/i);
    await expect(body).toContainText(/Marcar Demo|Book a Demo|Entrar|Sign in/i);

    await expect(page.locator('a[href="/pt/book-demo"]').first()).toBeVisible();
    await expect(page.locator('a[href="/pt/login"]').first()).toBeVisible();
    await expect(page.locator('a[href="/pt/pricing"]').first()).toBeVisible();

    const bodyText = await body.innerText();
    expect(bodyText).not.toMatch(/Unhandled Runtime Error|Application error|stack trace|SUPABASE_SERVICE_ROLE_KEY|HEALTHCHECK_TOKEN/i);

    const actionableLinks = await page.locator('a[href]').evaluateAll((links) =>
      links
        .map((link) => link.getAttribute('href'))
        .filter((href): href is string => Boolean(href && href.trim() && href !== '#')),
    );

    expect(actionableLinks.length).toBeGreaterThanOrEqual(3);
  });

  test('serves public health as a simple redacted readiness-independent endpoint', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBeLessThan(500);
    expect(response.headers()['cache-control'] ?? '').toMatch(/no-store/i);

    const payload = await response.json();
    expect(payload).toEqual(expect.objectContaining({ status: 'ok' }));
    expect(JSON.stringify(payload)).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|HEALTHCHECK_TOKEN|whsec_|sk_/i);
  });
});
