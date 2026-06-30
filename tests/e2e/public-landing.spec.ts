import { expect, test, type Page } from '@playwright/test';

const locales = ['en', 'pt', 'es', 'fr'] as const;

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow, `${label} has horizontal overflow`).toBe(false);
}

test.describe('public prelaunch landing', () => {
  for (const locale of locales) {
    test(`renders the ${locale.toUpperCase()} prelaunch waitlist landing`, async ({ page }) => {
      const response = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });

      expect(response?.status(), `${locale} landing should not 404`).not.toBe(404);
      expect(response?.status(), `${locale} landing should not server-error`).toBeLessThan(500);
      await expect(page.getByRole('link', { name: /RISCK COMPLY/i }).first()).toBeVisible();
      await expect(page.locator('body')).toContainText(/waitlist|lista de espera|Controlled beta|Beta controlada/i);
      await expect(page.locator('body')).toContainText(/AI inventory|Inventário de IA|risk classification|classificação de risco/i);
      await expect(page.locator('body')).toContainText(/1 July 2026|1 de julho de 2026|07:00 Europe\/Lisbon/i);
      await expect(page.locator('#waitlist-form')).toBeVisible();
      await expectNoHorizontalOverflow(page, `${locale} prelaunch landing desktop`);
    });
  }

  test('keeps language options visible before launch access', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /^EN$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^PT$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^ES$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^FR$/ })).toBeVisible();
  });

  test('keeps the waitlist CTA anchored to the lead form', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /^Join waitlist$/i }).first()).toHaveAttribute('href', '#waitlist-form');
    await expect(page.getByRole('button', { name: /^Join waitlist$/i })).toBeVisible();
  });

  test('renders required prelaunch sections on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Launch checklist')).toBeVisible();
    await expect(page.getByText('AI inventory').first()).toBeVisible();
    await expect(page.getByText('Risk classification').first()).toBeVisible();
    await expect(page.getByText('Evidence packs').first()).toBeVisible();
    await expect(page.getByText('Policy generator').first()).toBeVisible();
    await expect(page.locator('#waitlist-form')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'prelaunch landing mobile');
  });
});
