import { expect, test, type Page } from '@playwright/test';

const locales = ['en', 'pt', 'es', 'fr'] as const;

function visibleWaitlistForm(page: Page) {
  return page.getByRole('main').locator('#waitlist-form').first();
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow, `${label} has horizontal overflow`).toBe(false);
}

async function expectControlledAccessLanding(page: Page, locale: string) {
  const response = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });

  expect(response?.status(), `${locale} landing should not 404`).not.toBe(404);
  expect(response?.status(), `${locale} landing should not server-error`).toBeLessThan(500);
  await expect(page.getByRole('link', { name: /RISCK COMPLY/i }).first()).toBeVisible();
  await expect(page.locator('main h1:visible').first()).toContainText(/AI governance|governança de IA/i);
  await expect(page.locator('body')).toContainText(/Controlled access|early access|Request access|Pedir acesso/i);
  await expect(page.locator('body')).toContainText(/AI Act readiness|risk visibility|governance workflows|evidence preparation|visibilidade de risco/i);
  await expect(page.locator('body')).toContainText(/1 August 2026|1 de agosto de 2026|07:00 Europe\/Lisbon/i);
  await expect(visibleWaitlistForm(page)).toBeVisible();
}

test.describe('public controlled-access landing', () => {
  for (const locale of locales) {
    test(`renders the ${locale.toUpperCase()} controlled-access landing`, async ({ page }) => {
      await expectControlledAccessLanding(page, locale);
      await expectNoHorizontalOverflow(page, `${locale} controlled-access landing desktop`);
    });
  }

  test('keeps language options visible before launch access', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /^en$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^pt$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^es$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^fr$/i })).toBeVisible();
  });

  test('keeps the request-access CTA anchored to the lead form', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /Request access/i }).first()).toHaveAttribute('href', '#waitlist-form');
    await expect(page.getByRole('button', { name: /Request access/i })).toBeVisible();
  });

  test('renders required controlled-access sections on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Enterprise operating layer').first()).toBeVisible();
    await expect(page.getByText('Review-ready evidence').first()).toBeVisible();
    await expect(page.getByText('Legal review support').first()).toBeVisible();
    await expect(page.getByText('Procurement confidence').first()).toBeVisible();
    await expect(visibleWaitlistForm(page)).toBeVisible();
    await expectNoHorizontalOverflow(page, 'controlled-access landing mobile');
  });
});
