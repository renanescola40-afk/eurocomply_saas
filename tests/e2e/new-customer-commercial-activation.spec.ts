import { expect, test } from '@playwright/test';

const storageState = process.env.E2E_NEW_CUSTOMER_STORAGE_STATE;
const newCustomerEmail = process.env.E2E_NEW_CUSTOMER_EMAIL;
const newCustomerPassword = process.env.E2E_NEW_CUSTOMER_PASSWORD;
const allowSyntheticWrites = process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true';
const customerSessionConfigured = Boolean(storageState || (newCustomerEmail && newCustomerPassword));

test.describe('new customer commercial activation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('risckcomply.analytics.consent', 'denied'));
  });
  test.skip(!customerSessionConfigured || !allowSyntheticWrites, 'Requires a disposable pre-onboarding customer and E2E_ALLOW_SYNTHETIC_APP_WRITES=true.');
  if (storageState) test.use({ storageState });

  test('checkout selection → onboarding write → payment gate preserves the selected plan', async ({ page }) => {
    if (!storageState) {
      const nextPath = '/en/checkout?plan=professional';
      await page.goto(`/en/login?next=${encodeURIComponent(nextPath)}`, { waitUntil: 'domcontentloaded' });
      const emailInput = page.getByRole('textbox', { name: 'Work email', exact: true });
      const form = page.locator('form').filter({ has: emailInput });
      const submit = form.locator('button[type="submit"]');

      await emailInput.fill(newCustomerEmail!);
      await form.getByLabel('Password', { exact: true }).fill(newCustomerPassword!);
      await submit.click();

      // The client-side router transition can lag behind Supabase persisting the
      // authenticated session. Prove the durable auth state first, then navigate
      // to the requested continuation explicitly instead of racing router.replace.
      await expect.poll(async () => {
        const cookies = await page.context().cookies();
        return cookies.some((cookie) => cookie.name.includes('auth-token') && Boolean(cookie.value));
      }, { timeout: 30_000 }).toBe(true);

      await page.goto(nextPath, { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(/\/en\/login(?:\?|$)/);
      await expect(page).toHaveURL(/\/en\/checkout\?plan=professional/);
    }

    const organizationName = `QA Activation ${Date.now()}`;
    const aiSystemName = `QA First AI ${Date.now()}`;

    await page.goto('/en/onboarding?plan=professional', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/onboarding\?plan=professional/);
    await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);

    await page.getByLabel('Organization name').fill(organizationName);
    await expect(page.getByLabel('Workspace slug')).not.toHaveValue('');

    // create organization → country → company type → sector → AI usage → first AI system
    for (let index = 0; index < 5; index += 1) {
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
    }

    await page.getByLabel('AI system name').fill(aiSystemName);
    await page.getByLabel('Owner team').fill('QA Governance');
    await page.getByLabel('Use case').fill('Synthetic QA assistant used only to validate the controlled onboarding activation workflow.');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    // risk → readiness → documents → tasks → team → plan
    for (let index = 0; index < 5; index += 1) {
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
    }

    await page.getByRole('button', { name: 'Generate readiness score' }).click();

    // Successful completion may navigate immediately, removing the transient
    // live-region message before Playwright can observe it. Prove the durable
    // activation result instead: onboarding exits and the selected plan survives
    // into the destination URL.
    await expect(page).not.toHaveURL(/\/en\/onboarding/, { timeout: 30_000 });
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toMatch(/\/en\/(dashboard\/organizations|checkout)/);
    expect(page.url()).toContain('professional');
    await expect(page.locator('body')).not.toContainText(/Unable to complete onboarding activation|Commercial activation is temporarily unavailable/i);
    await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);
  });
});
