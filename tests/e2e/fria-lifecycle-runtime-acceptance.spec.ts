import { expect, test, type Page } from '@playwright/test';

const ownerStorageState = process.env.E2E_OWNER_STORAGE_STATE;
const approverStorageState = process.env.E2E_FRIA_APPROVER_STORAGE_STATE;
const reviewerEmail = process.env.E2E_FRIA_REVIEWER_EMAIL?.trim().toLowerCase();
const approverEmail = process.env.E2E_FRIA_APPROVER_EMAIL?.trim().toLowerCase();
const allowSyntheticWrites = process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true';
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectHealthyAuthenticatedPage(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not expose runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should not fall back to login`).not.toContain('/login');
}

async function selectOptionContaining(page: Page, selector: string, value: string) {
  const option = page.locator(`${selector} option`).filter({ hasText: new RegExp(escapeRegex(value), 'i') }).first();
  await expect(option, `${selector} should expose ${value}`).toBeAttached();
  const optionValue = await option.getAttribute('value');
  expect(optionValue, `${selector} option should have a canonical value`).toBeTruthy();
  await page.locator(selector).selectOption(optionValue!);
  return optionValue!;
}

function workflowResponse(page: Page, workflow: string) {
  return page.waitForResponse((response) => {
    return response.request().method() === 'POST'
      && response.url().includes(`/api/ai-governance/fria?workflow=${workflow}`);
  });
}

test.describe('authenticated FRIA lifecycle runtime acceptance', () => {
  test.skip(!ownerStorageState, 'E2E_OWNER_STORAGE_STATE must point to a disposable paid-owner QA fixture.');
  test.skip(!approverStorageState, 'E2E_FRIA_APPROVER_STORAGE_STATE must point to the disposable QA approver session.');
  test.skip(!reviewerEmail, 'E2E_FRIA_REVIEWER_EMAIL must identify an eligible non-owner governance reviewer.');
  test.skip(!approverEmail, 'E2E_FRIA_APPROVER_EMAIL must identify an eligible non-owner governance approver.');
  test.skip(
    Boolean(reviewerEmail && approverEmail && reviewerEmail === approverEmail),
    'FRIA reviewer and approver must be distinct identities.',
  );
  test.skip(!allowSyntheticWrites, 'Synthetic FRIA writes require E2E_ALLOW_SYNTHETIC_APP_WRITES=true on disposable QA.');

  if (ownerStorageState) test.use({ storageState: ownerStorageState });

  test('owner creates and evidences a FRIA; assigned approver independently approves it', async ({ page, browser }) => {
    const systemName = `QA FRIA system ${Date.now()}`;

    await page.goto('/en/ai-systems', { waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'AI inventory prerequisite');
    await page.getByPlaceholder(/system name/i).fill(systemName);
    await page.getByPlaceholder(/example: summarises/i).fill(
      'Synthetic disposable QA system used only to prove the FRIA lifecycle and separation of functions.',
    );
    await page.getByRole('button', { name: /classify and save/i }).click();
    await expect(page.getByText(systemName, { exact: true })).toBeVisible();

    await page.goto('/en/dashboard/fria', { waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'FRIA owner workspace');
    await expect(page.getByRole('heading', { name: 'FRIA workspace' })).toBeVisible();

    await selectOptionContaining(page, '#fria-ai-system', systemName);
    const createResponsePromise = workflowResponse(page, 'assessment_create');
    await page.getByRole('button', { name: 'Create assessment' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json() as { assessment?: { id?: string } };
    expect(created.assessment?.id).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(page.getByRole('button').filter({ hasText: systemName }).first()).toBeVisible();

    await page.locator('#fria-applicability').selectOption('not_required');
    await page.locator('#fria-purpose').fill('Document why this disposable QA scenario does not require the full Article 27 assessment path.');

    const reviewerId = await selectOptionContaining(page, '#fria-reviewer', reviewerEmail!);
    const approverId = await selectOptionContaining(page, '#fria-approver', approverEmail!);
    expect(reviewerId).not.toBe(approverId);
    await page.locator('#fria-legal-reviewer').selectOption(reviewerId);
    await page.getByLabel('Legal review completed').check();

    const updateResponsePromise = workflowResponse(page, 'assessment_update');
    await page.getByRole('button', { name: 'Save assessment' }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.status()).toBe(200);
    await expect(page.getByRole('status')).toContainText('Workflow saved and audit evidence persisted.');

    const submitEvidence = async (controlId: 'FRIA-01' | 'FRIA-15', digestCharacter: string) => {
      await page.locator('#fria-control-id').fill(controlId);
      await page.locator('#fria-evidence-type').fill(`Disposable QA evidence ${controlId}`);
      await page.locator('#fria-storage-ref').fill('');
      await page.locator('#fria-evidence-digest').fill(digestCharacter.repeat(64));
      const evidenceResponsePromise = workflowResponse(page, 'evidence_submit');
      await page.getByRole('button', { name: 'Submit evidence' }).click();
      const evidenceResponse = await evidenceResponsePromise;
      expect(evidenceResponse.status()).toBe(201);
      await expect(page.getByText(controlId, { exact: true }).first()).toBeVisible();
    };

    await submitEvidence('FRIA-01', 'a');
    await submitEvidence('FRIA-15', 'b');
    await expect(page.getByText('2 evidence records', { exact: true })).toBeVisible();

    const approverContext = await browser.newContext({
      storageState: approverStorageState!,
      baseURL,
    });

    try {
      const approverPage = await approverContext.newPage();
      await approverPage.goto('/en/dashboard/fria', { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(approverPage, 'FRIA approver workspace');
      await expect(approverPage.getByRole('heading', { name: 'FRIA workspace' })).toBeVisible();

      const targetAssessment = approverPage.getByRole('button').filter({ hasText: systemName }).first();
      await expect(targetAssessment).toBeVisible();
      await targetAssessment.click();

      await approverPage.getByLabel('Approval rationale').fill(
        'Independent QA approval after assignment, legal review and the required FRIA-01 and FRIA-15 evidence were recorded.',
      );
      const approveResponsePromise = workflowResponse(approverPage, 'assessment_approve');
      await approverPage.getByRole('button', { name: 'Approve assessment' }).click();
      const approveResponse = await approveResponsePromise;
      expect(approveResponse.status()).toBe(200);
      await expect(approverPage.getByText('approved', { exact: true }).first()).toBeVisible();
      await expect(approverPage.getByRole('button', { name: 'Approve assessment' })).toHaveCount(0);
    } finally {
      await approverContext.close();
    }
  });
});
