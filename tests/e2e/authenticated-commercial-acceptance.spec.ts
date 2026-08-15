import { expect, test, type Page } from '@playwright/test';

async function expectHealthyAuthenticatedPage(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not expose runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should not fall back to login`).not.toContain('/login');
  expect(page.url(), `${label} should not navigate to undefined`).not.toContain('/undefined');
}

const roleFixtures = [
  { role: 'owner', env: 'E2E_OWNER_STORAGE_STATE', canManageBilling: true },
  { role: 'admin', env: 'E2E_ADMIN_STORAGE_STATE', canManageBilling: false },
  { role: 'member', env: 'E2E_MEMBER_STORAGE_STATE', canManageBilling: false },
  { role: 'viewer', env: 'E2E_VIEWER_STORAGE_STATE', canManageBilling: false },
] as const;

for (const fixture of roleFixtures) {
  test.describe(`authenticated ${fixture.role} commercial UX`, () => {
    const storageState = process.env[fixture.env];
    test.skip(!storageState, `${fixture.env} must point to a disposable QA storage-state fixture.`);
    if (storageState) test.use({ storageState });

    test('active subscriber can reach the organization dashboard', async ({ page }) => {
      await page.goto('/pt/dashboard/organizations', { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, `${fixture.role} dashboard`);
      expect(page.url()).not.toContain('/checkout?');
      await expect(page.locator('main')).toBeVisible();
    });

    test('billing controls match the authenticated role before mutation', async ({ page }) => {
      await page.goto('/pt/dashboard/organizations/billing', { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, `${fixture.role} billing`);

      if (fixture.canManageBilling) {
        await expect(page.getByText(/A faturação é apenas de leitura para a sua função/i)).toHaveCount(0);
        await expect(page.getByRole('button', { name: /abrir portal de faturação/i })).toBeVisible();
      } else {
        await expect(page.getByText(/A faturação é apenas de leitura para a sua função/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /acesso de owner necessário/i })).toBeDisabled();
        await expect(page.getByRole('button', { name: /ação do owner necessária/i }).first()).toBeDisabled();
      }
    });
  });
}

test.describe('authenticated recurring product smoke', () => {
  const ownerStorageState = process.env.E2E_OWNER_STORAGE_STATE;
  test.skip(!ownerStorageState, 'E2E_OWNER_STORAGE_STATE must point to a disposable paid-owner QA fixture.');
  if (ownerStorageState) test.use({ storageState: ownerStorageState });

  const recurringRoutes = [
    ['/pt/dashboard/organizations', 'dashboard'],
    ['/pt/ai-systems', 'AI system inventory'],
    ['/pt/dashboard/fria', 'FRIA assessment'],
    ['/pt/dashboard/organizations/documents', 'evidence documents'],
    ['/pt/auditoria', 'audit activity'],
  ] as const;

  for (const [route, label] of recurringRoutes) {
    test(`${label} route stays usable for an existing paid owner`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, label);
      expect(page.url()).not.toContain('/checkout?');
      await expect(page.locator('main')).toBeVisible();
    });
  }

  test('first AI system can be created only when disposable writes are explicitly enabled', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES !== 'true', 'Synthetic writes require E2E_ALLOW_SYNTHETIC_APP_WRITES=true on a disposable QA project.');

    const uniqueName = `QA AI System ${Date.now()}`;
    await page.goto('/pt/ai-systems', { waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'AI systems write');

    await page.getByPlaceholder(/nome do sistema|system name/i).fill(uniqueName);
    await page.getByPlaceholder(/example: summarises|exemplo:/i).fill('Summarises synthetic QA support tickets for deterministic product acceptance testing.');
    await page.getByRole('button', { name: /classificar e guardar|classify and save/i }).click();

    await expect(page.getByText(uniqueName, { exact: true })).toBeVisible();
  });
});

const blockedSubscriptionFixtures = [
  { label: 'canceled', env: 'E2E_CANCELED_STORAGE_STATE' },
  { label: 'past_due', env: 'E2E_PAST_DUE_STORAGE_STATE' },
  { label: 'unpaid', env: 'E2E_UNPAID_STORAGE_STATE' },
] as const;

for (const fixture of blockedSubscriptionFixtures) {
  test.describe(`${fixture.label} subscription access`, () => {
    const storageState = process.env[fixture.env];
    test.skip(!storageState, `${fixture.env} must point to a disposable QA fixture with the matching billing state.`);
    if (storageState) test.use({ storageState });

    test('paid product fails closed and routes to commercial recovery', async ({ page }) => {
      await page.goto('/pt/dashboard/organizations', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/pt\/(checkout\?plan=|contact\?intent=sales&plan=)/);
      const recoveryUrl = page.url();
      expect(recoveryUrl.includes('access=required') || recoveryUrl.includes('checkout=required')).toBe(true);
      await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);
    });
  });
}
