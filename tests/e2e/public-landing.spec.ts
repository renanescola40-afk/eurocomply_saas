import { expect, test, type Page } from '@playwright/test';

const locales = ['en', 'pt', 'es', 'fr'] as const;

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow, `${label} has horizontal overflow`).toBe(false);
}

async function expectProductionLanding(page: Page, locale: string) {
  const response = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });

  expect(response?.status(), `${locale} landing should not 404`).not.toBe(404);
  expect(response?.status(), `${locale} landing should not server-error`).toBeLessThan(500);

  await expect(page.getByRole('link', { name: /RISCK COMPLY/i }).first()).toBeVisible();
  await expect(page.locator('main h1:visible').first()).toContainText(/AI governance|governan[cç]a de IA/i);
  await expect(page.locator('body')).toContainText(/AI inventory|inventário de IA|risk assessments|avaliações de risco/i);
  await expect(page.locator('body')).toContainText(/evidence workflows|workflows de evidência|activity history|histórico de atividade/i);

  await expect(page.locator(`a[href="/${locale}/signup"]:visible`).first()).toBeVisible();
  await expect(page.locator(`a[href="/${locale}/login"]:visible`).first()).toBeVisible();
  await expect(page.locator(`a[href="/${locale}/pricing"]:visible`).first()).toBeVisible();
}

test.describe('public production landing', () => {
  for (const locale of locales) {
    test(`renders the ${locale.toUpperCase()} production landing`, async ({ page }) => {
      await expectProductionLanding(page, locale);
      await expectNoHorizontalOverflow(page, `${locale} production landing desktop`);
    });
  }

  test('keeps language options available on the public landing', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /language|idioma|english/i }).first()).toBeVisible();
  });

  test('routes primary conversion CTAs to authentication and pricing', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('a[href="/en/signup"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/en/login"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/en/pricing"]:visible').first()).toBeVisible();
  });

  test('renders required production sections on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('One operational source of truth').first()).toBeVisible();
    await expect(page.getByText('From discovery to review').first()).toBeVisible();
    await expect(page.getByText('Controlled by design').first()).toBeVisible();
    await expect(page.locator('a[href="/en/signup"]:visible').first()).toBeVisible();
    await expectNoHorizontalOverflow(page, 'production landing mobile');
  });
});
