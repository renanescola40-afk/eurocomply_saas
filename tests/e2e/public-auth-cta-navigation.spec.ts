import { expect, test, type Page } from '@playwright/test';

const LOCALE = 'pt';
const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

function escapeRegExp(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

async function expectClickableLinkNavigation(page: Page, name: RegExp, expectedPath: string) {
  await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

  const link = page.getByRole('link', { name }).first();
  await expect(link).toBeVisible();
  await expect(link).toBeEnabled();

  await link.click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(expectedPath)}(?:$|[?#])`));
  await expect(page.locator('body')).toBeVisible();
}

test.describe('public landing auth CTA navigation', () => {
  test('header login link navigates to localized login', async ({ page }) => {
    await expectClickableLinkNavigation(page, /^Entrar$/i, `/${LOCALE}/login`);
  });

  test('floating create-account link navigates to signup with a plan and onboarding next', async ({ page }) => {
    test.skip(!CLERK_ENABLED, 'Floating Clerk controls are not rendered without NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.');

    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    const createAccountLink = page.getByRole('link', { name: /^Criar conta$/i }).first();
    await expect(createAccountLink).toBeVisible();
    await expect(createAccountLink).toBeEnabled();

    await createAccountLink.click();

    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(`/${LOCALE}/signup`)}(?:$|[?#])`));
    const url = new URL(page.url());
    expect(url.searchParams.get('plan')).toBe('professional');
    expect(url.searchParams.get('next')).toBe(`/${LOCALE}/onboarding?plan=professional`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('hero trial CTA navigates to signup with onboarding continuation', async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: 'domcontentloaded' });

    const trialLink = page.getByRole('link', { name: /Iniciar trial/i }).first();
    await expect(trialLink).toBeVisible();
    await expect(trialLink).toBeEnabled();

    await trialLink.click();

    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(`/${LOCALE}/signup`)}(?:$|[?#])`));
    const url = new URL(page.url());
    expect(url.searchParams.get('plan')).toBe('professional');
    expect(url.searchParams.get('next')).toBe(`/${LOCALE}/onboarding`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('demo CTA navigates to contact demo page', async ({ page }) => {
    await expectClickableLinkNavigation(page, /Marcar demo/i, `/${LOCALE}/contact`);
    expect(new URL(page.url()).searchParams.get('intent')).toBe('demo');
  });
});
