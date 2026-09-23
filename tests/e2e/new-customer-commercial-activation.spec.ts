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
      await page.goto('/en/login?next=%2Fen%2Fcheckout%3Fplan%3Dprofessional', { waitUntil: 'domcontentloaded' });
      const emailInput = page.getByRole('textbox', { name: 'Work email', exact: true });
      const form = page.locator('form').filter({ has: emailInput });
      await emailInput.fill(newCustomerEmail!);
      await form.getByLabel('Password', { exact: true }).fill(newCustomerPassword!);
      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000, waitUntil: 'domcontentloaded' }),
        form.locator('button[type="submit"]').click(),
      ]);
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
    await expect(page.getByRole('status')).toContainText(/Onboarding completed/i, { timeout: 20_000 });

    // Onboarding creates the organization and first AI system, but does not bypass billing.
    await expect(page).not.toHaveURL(/\/en\/onboarding/, { timeout: 20_000 });
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toMatch(/\/en\/(dashboard\/organizations|checkout)/);
    expect(page.url()).toContain('professional');
    await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);
  });
});
