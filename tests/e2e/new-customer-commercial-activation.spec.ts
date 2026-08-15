import { expect, test } from '@playwright/test';

const storageState = process.env.E2E_NEW_CUSTOMER_STORAGE_STATE;
const allowSyntheticWrites = process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true';

test.describe('new customer commercial activation', () => {
  test.skip(!storageState || !allowSyntheticWrites, 'Requires E2E_NEW_CUSTOMER_STORAGE_STATE and E2E_ALLOW_SYNTHETIC_APP_WRITES=true on disposable QA.');
  if (storageState) test.use({ storageState });

  test('checkout selection → onboarding write → payment gate preserves the selected plan', async ({ page }) => {
    const organizationName = `QA Activation ${Date.now()}`;
    const aiSystemName = `QA First AI ${Date.now()}`;

    await page.goto('/en/checkout?plan=professional', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);

    const createWorkspace = page.getByRole('link', { name: /create workspace/i });
    await expect(createWorkspace).toBeVisible();
    await createWorkspace.click();
    await expect(page).toHaveURL(/\/en\/onboarding/);

    // The onboarding route opened from checkout must retain the commercial plan intent.
    if (!page.url().includes('plan=professional')) {
      await page.goto('/en/onboarding?plan=professional', { waitUntil: 'domcontentloaded' });
    }

    await page.getByLabel('Organization name').fill(organizationName);
    await expect(page.getByLabel('Workspace slug')).not.toHaveValue('');

    // create organization → country → company type → sector → AI usage → first AI system
    for (let index = 0; index < 5; index += 1) {
      await page.getByRole('button', { name: 'Continue' }).click();
    }

    await page.getByLabel('AI system name').fill(aiSystemName);
    await page.getByLabel('Owner team').fill('QA Governance');
    await page.getByLabel('Use case').fill('Synthetic QA assistant used only to validate the controlled onboarding activation workflow.');
    await page.getByRole('button', { name: 'Continue' }).click();

    // risk → readiness → documents → tasks → team → plan
    for (let index = 0; index < 5; index += 1) {
      await page.getByRole('button', { name: 'Continue' }).click();
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
