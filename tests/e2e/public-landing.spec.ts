import { expect, test, type Page } from '@playwright/test';

const locales = ['en', 'pt', 'es', 'fr'] as const;

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow, `${label} has horizontal overflow`).toBe(false);
}

test.describe('public landing', () => {
  for (const locale of locales) {
    test(`renders the ${locale.toUpperCase()} enterprise AI Act landing`, async ({ page }) => {
      const response = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });

      expect(response?.status(), `${locale} landing should not 404`).not.toBe(404);
      expect(response?.status(), `${locale} landing should not server-error`).toBeLessThan(500);
      await expect(page.getByRole('link', { name: /RISCK COMPLY/i }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /Entrar|Log in|Iniciar sesión|Connexion/i })).toBeVisible();
      await expect(page.locator('body')).toContainText(/AI Act readiness|AI compliance|governance evidence|Inventário de IA/i);
      await expect(page.locator('body')).toContainText(/does not guarantee|does not replace|não garante|não substitui/i);
      await expectNoHorizontalOverflow(page, `${locale} landing desktop`);
    });
  }

  test('keeps language options visible before login', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /^EN$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^PT$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^ES$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^FR$/ })).toBeVisible();
  });

  test('exposes working conversion CTAs with real destinations', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /^Start trial/i }).first()).toHaveAttribute('href', /\/en\/signup\?plan=professional&next=\/en\/onboarding/);
    await expect(page.getByRole('link', { name: /^Join waitlist/i })).toHaveAttribute('href', /\/en\/signup\?plan=professional&next=\/en\/onboarding/);
    await expect(page.getByRole('link', { name: /^Book demo/i }).first()).toHaveAttribute('href', /\/en\/contact\?intent=demo/);
    await expect(page.getByRole('link', { name: /^Talk to sales/i }).first()).toHaveAttribute('href', /\/en\/contact\?intent=sales/);
    await expect(page.getByRole('link', { name: /^Start Essential/i })).toHaveAttribute('href', /\/en\/billing\/checkout\/essential|\/en\/checkout\?plan=essential/);
    await expect(page.getByRole('link', { name: /^Choose Business/i })).toHaveAttribute('href', /\/en\/book-demo\?plan=business/);
  });

  test('renders the public enterprise sales page without requiring login', async ({ page }) => {
    const response = await page.goto('/en/enterprise', { waitUntil: 'domcontentloaded' });

    expect(response?.status(), 'enterprise page should not 404').not.toBe(404);
    expect(response?.status(), 'enterprise page should not server-error').toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/Enterprise AI governance/i);
    await expect(page.locator('body')).toContainText(/without unsupported legal or certification claims/i);
    await expect(page.getByRole('link', { name: /Book Enterprise Readiness Demo/i })).toHaveAttribute('href', /\/en\/book-demo\?plan=enterprise/);
    await expectNoHorizontalOverflow(page, 'enterprise sales page desktop');
  });

  test('renders required enterprise conversion sections on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('The problem')).toBeVisible();
    await expect(page.getByText('What the platform generates')).toBeVisible();
    await expect(page.getByText('Dashboard preview')).toBeVisible();
    await expect(page.getByText('AI inventory').first()).toBeVisible();
    await expect(page.getByText('Risk classification').first()).toBeVisible();
    await expect(page.getByText('Evidence pack').first()).toBeVisible();
    await expect(page.getByText('Policy generator').first()).toBeVisible();
    await expect(page.getByText('Trust and security')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
    await expect(page.getByText('FAQ')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'enterprise landing mobile');
  });
});
