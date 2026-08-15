import { expect, test, type Page } from '@playwright/test';

const allowSyntheticWrites = process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true';

async function expectHealthyAuthenticatedPage(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not expose runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should not fall back to login`).not.toContain('/login');
  expect(page.url(), `${label} should not navigate to undefined`).not.toContain('/undefined');
}

const roleFixtures = [
  { role: 'owner', env: 'E2E_OWNER_STORAGE_STATE', canManageBilling: true, canManageTasks: true, canManageDocuments: true, canManageTeam: true, canManageAi: true },
  { role: 'admin', env: 'E2E_ADMIN_STORAGE_STATE', canManageBilling: false, canManageTasks: true, canManageDocuments: true, canManageTeam: true, canManageAi: true },
  { role: 'member', env: 'E2E_MEMBER_STORAGE_STATE', canManageBilling: false, canManageTasks: false, canManageDocuments: true, canManageTeam: false, canManageAi: false },
  { role: 'viewer', env: 'E2E_VIEWER_STORAGE_STATE', canManageBilling: false, canManageTasks: false, canManageDocuments: false, canManageTeam: false, canManageAi: false },
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

    test('AI inventory creation controls match canonical governance permissions', async ({ page }) => {
      await page.goto('/en/ai-systems', { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, `${fixture.role} AI inventory`);
      const readOnly = page.getByText(/your role can review AI systems, risk classification and governance readiness/i);
      if (fixture.canManageAi) {
        await expect(readOnly).toHaveCount(0);
        await expect(page.getByRole('button', { name: /classify and save/i })).toBeVisible();
      } else {
        await expect(readOnly).toBeVisible();
        await expect(page.getByRole('button', { name: /classify and save/i })).toHaveCount(0);
      }
    });

    test('task mutation controls match canonical role permissions', async ({ page }) => {
      await page.goto('/en/dashboard/organizations/tasks', { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, `${fixture.role} tasks`);
      const readOnly = page.getByText(/can review compliance tasks but cannot create, edit, complete or delete/i);
      if (fixture.canManageTasks) {
        await expect(readOnly).toHaveCount(0);
      } else {
        await expect(readOnly).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create task' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
      }
    });

    test('document mutation controls match canonical role permissions', async ({ page }) => {
      await page.goto('/en/dashboard/organizations/documents', { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, `${fixture.role} documents`);
      const readOnly = page.getByText(/can review and download compliance documents but cannot upload or delete/i);
      if (fixture.canManageDocuments) {
        await expect(readOnly).toHaveCount(0);
      } else {
        await expect(readOnly).toBeVisible();
        await expect(page.getByRole('button', { name: 'Upload document' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
      }
    });

    test('team workspace is denied unless the role has manage_team', async ({ page }) => {
      await page.goto('/en/dashboard/organizations/team', { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, `${fixture.role} team`);
      const denied = page.getByText(/team access is restricted/i);
      if (fixture.canManageTeam) {
        await expect(denied).toHaveCount(0);
      } else {
        await expect(denied).toBeVisible();
        await expect(page.getByRole('button', { name: /send invitation/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /remove/i })).toHaveCount(0);
        await expect(page.getByText(/pending invitations/i)).toHaveCount(0);
      }
    });
  });
}

test.describe('authenticated existing subscriber activation and recurring use', () => {
  const ownerStorageState = process.env.E2E_OWNER_STORAGE_STATE;
  test.skip(!ownerStorageState, 'E2E_OWNER_STORAGE_STATE must point to a disposable paid-owner QA fixture.');
  if (ownerStorageState) test.use({ storageState: ownerStorageState });

  const recurringRoutes = [
    ['/en/dashboard/organizations', 'dashboard'],
    ['/en/ai-systems', 'AI system inventory'],
    ['/en/dashboard/fria', 'FRIA assessment'],
    ['/en/dashboard/organizations/documents', 'evidence documents'],
    ['/en/dashboard/organizations/tasks', 'compliance tasks'],
    ['/en/dashboard/organizations/team', 'team access'],
    ['/en/auditoria', 'audit activity'],
  ] as const;

  for (const [route, label] of recurringRoutes) {
    test(`${label} route stays usable for an existing paid owner`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, label);
      expect(page.url()).not.toContain('/checkout?');
      await expect(page.locator('main')).toBeVisible();
    });
  }

  test('checkout completion trusts persisted active subscription and enters the product', async ({ page }) => {
    await page.goto('/en/checkout/complete', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/dashboard\/organizations(?:\?|$)/, { timeout: 20_000 });
    await expectHealthyAuthenticatedPage(page, 'checkout completion');
  });

  test('AI system create → edit → archive works on disposable QA', async ({ page }) => {
    test.skip(!allowSyntheticWrites, 'Synthetic writes require E2E_ALLOW_SYNTHETIC_APP_WRITES=true on a disposable QA project.');

    const uniqueName = `QA AI System ${Date.now()}`;
    const updatedName = `${uniqueName} Reviewed`;
    await page.goto('/en/ai-systems', { waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'AI systems write');

    await page.getByPlaceholder(/system name/i).fill(uniqueName);
    await page.getByPlaceholder(/example: summarises/i).fill('Summarises synthetic QA support tickets for deterministic product acceptance testing.');
    await page.getByRole('button', { name: /classify and save/i }).click();
    await expect(page.getByText(uniqueName, { exact: true })).toBeVisible();

    const systemCard = page.locator('article').filter({ hasText: uniqueName }).first();
    await systemCard.getByRole('link', { name: /review/i }).click();
    await expectHealthyAuthenticatedPage(page, 'AI system detail');

    await page.getByLabel(/system name/i).fill(updatedName);
    await page.getByLabel(/lifecycle status/i).selectOption('retired');
    await page.getByRole('button', { name: /save reassessment/i }).click();
    await expect(page.getByLabel(/system name/i)).toHaveValue(updatedName);
    await expect(page.getByLabel(/lifecycle status/i)).toHaveValue('retired');
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('task create → edit → complete → delete cleans itself up', async ({ page }) => {
    test.skip(!allowSyntheticWrites, 'Synthetic writes require E2E_ALLOW_SYNTHETIC_APP_WRITES=true on a disposable QA project.');

    const uniqueTitle = `QA task ${Date.now()}`;
    const updatedTitle = `${uniqueTitle} reviewed`;
    await page.goto('/en/dashboard/organizations/tasks', { waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'task CRUD');

    await page.getByLabel('Title').first().fill(uniqueTitle);
    await page.getByLabel('Description').first().fill('Disposable QA task for product acceptance.');
    await page.getByRole('button', { name: 'Create task' }).click();
    await expect(page.getByText(uniqueTitle, { exact: true })).toBeVisible();

    let taskRow = page.locator('[data-task-id]').filter({ hasText: uniqueTitle }).first();
    await taskRow.getByRole('button', { name: 'Edit' }).click();
    await taskRow.getByLabel('Title').fill(updatedTitle);
    await taskRow.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(updatedTitle, { exact: true })).toBeVisible();

    taskRow = page.locator('[data-task-id]').filter({ hasText: updatedTitle }).first();
    await taskRow.getByRole('button', { name: 'Mark done' }).click();
    await expect(taskRow).toContainText(/done/i);

    page.once('dialog', (dialog) => void dialog.accept());
    await taskRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(updatedTitle, { exact: true })).toHaveCount(0);
  });

  test('document create → delete cleans itself up when secure upload scanning is available', async ({ page }) => {
    test.skip(!allowSyntheticWrites, 'Synthetic writes require E2E_ALLOW_SYNTHETIC_APP_WRITES=true on a disposable QA project.');

    const documentName = `QA evidence ${Date.now()}`;
    await page.goto('/en/dashboard/organizations/documents', { waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'document CRUD');

    await page.getByLabel('Name').fill(documentName);
    await page.getByLabel('Category').fill('QA evidence');
    await page.getByLabel('File').setInputFiles({
      name: 'qa-evidence.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
    });
    await page.getByRole('button', { name: 'Upload document' }).click();
    await expect(page.getByText(documentName, { exact: true })).toBeVisible({ timeout: 20_000 });

    const documentCard = page.locator('article').filter({ hasText: documentName }).first();
    page.once('dialog', (dialog) => void dialog.accept());
    await documentCard.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(documentName, { exact: true })).toHaveCount(0);
  });
});

const blockedSubscriptionFixtures = [
  { label: 'canceled', env: 'E2E_CANCELED_STORAGE_STATE' },
  { label: 'past_due', env: 'E2E_PAST_DUE_STORAGE_STATE' },
  { label: 'unpaid', env: 'E2E_UNPAID_STORAGE_STATE' },
  { label: 'incomplete', env: 'E2E_INCOMPLETE_STORAGE_STATE' },
] as const;

for (const fixture of blockedSubscriptionFixtures) {
  test.describe(`${fixture.label} subscription access`, () => {
    const storageState = process.env[fixture.env];
    test.skip(!storageState, `${fixture.env} must point to a disposable QA fixture with the matching billing state.`);
    if (storageState) test.use({ storageState });

    test('paid product fails closed and routes to commercial recovery', async ({ page }) => {
      await page.goto('/en/dashboard/organizations', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/en\/(checkout\?plan=|contact\?intent=sales&plan=)/);
      const recoveryUrl = page.url();
      expect(recoveryUrl.includes('access=required') || recoveryUrl.includes('checkout=required')).toBe(true);
      await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);
    });

    if (fixture.label !== 'canceled') {
      test('checkout completion remains pending and never grants product access', async ({ page }) => {
        await page.goto('/en/checkout/complete', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/en\/checkout\/complete/);
        await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);
        await expect(page).not.toHaveURL(/\/en\/dashboard\/organizations/, { timeout: 4_000 });
      });
    }
  });
}
