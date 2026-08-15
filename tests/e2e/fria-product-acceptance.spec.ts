import { expect, test } from '@playwright/test';

const storageState = process.env.E2E_FRIA_STORAGE_STATE;
const allowSyntheticWrites = process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true';

test.describe('FRIA product acceptance with disposable governance fixtures', () => {
  test.skip(!storageState || !allowSyntheticWrites, 'Requires E2E_FRIA_STORAGE_STATE and E2E_ALLOW_SYNTHETIC_APP_WRITES=true on disposable QA with at least two eligible non-owner assignees.');
  if (storageState) test.use({ storageState });

  test('AI system → FRIA create → human assignments → evidence → approval', async ({ page }) => {
    const aiSystemName = `QA FRIA System ${Date.now()}`;

    await page.goto('/en/ai-systems', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);
    await page.getByPlaceholder(/system name/i).fill(aiSystemName);
    await page.getByPlaceholder(/example: summarises/i).fill('Synthetic high-risk public-service workflow used only for disposable FRIA acceptance testing.');
    await page.getByRole('button', { name: /classify and save/i }).click();
    await expect(page.getByText(aiSystemName, { exact: true })).toBeVisible();

    await page.goto('/en/dashboard/fria', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'FRIA workspace' })).toBeVisible();
    await expect(page.getByText(/reviewer uuid|approver uuid|legal reviewer uuid/i)).toHaveCount(0);

    await page.getByLabel('Select an AI system').selectOption({ label: /QA FRIA System/ });
    await page.getByRole('button', { name: 'Create assessment' }).click();
    await expect(page.getByText(/Assessment v1/).last()).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('Applicability').selectOption('required');
    await page.getByLabel('Residual impact').selectOption('low');
    await page.getByLabel('Intended purpose').fill('Support a public-service eligibility workflow with documented human oversight and appeal channels.');
    await page.getByLabel('Affected groups').fill('Applicants\nEmployees');
    await page.getByLabel('Rights map').fill('Privacy\nNon-discrimination\nEffective remedy');
    await page.getByLabel('Impact analysis (structured JSON)').fill('{"summary":"Fundamental-rights impacts assessed","severity":"medium"}');
    await page.getByLabel('Mitigation plan (structured JSON)').fill('{"summary":"Human review, escalation and bias monitoring controls are active"}');
    await page.getByLabel('Human oversight (structured JSON)').fill('{"summary":"Named human operators review consequential outputs before action"}');
    await page.getByLabel('Complaints and redress (structured JSON)').fill('{"summary":"Affected people can contest decisions and request human review"}');

    await page.getByLabel('Public authority or public-service context applies').check();
    await page.getByLabel('High-risk system context applies').check();
    await page.getByLabel('Vulnerable groups were considered').check();
    await page.getByLabel('Monitoring plan is complete').check();
    await page.getByLabel('Data-protection coordination is complete').check();

    const reviewer = page.getByLabel('Independent reviewer');
    const approver = page.getByLabel('Approver');
    const legalReviewer = page.getByLabel('Legal reviewer');
    await expect(reviewer).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => reviewer.locator('option').count()).toBeGreaterThan(1);
    await reviewer.selectOption({ index: 1 });
    await expect.poll(async () => approver.locator('option').count()).toBeGreaterThan(1);
    await approver.selectOption({ index: 1 });
    await expect.poll(async () => legalReviewer.locator('option').count()).toBeGreaterThan(1);
    await legalReviewer.selectOption({ index: 1 });
    await page.getByLabel('Legal review completed').check();

    await page.getByRole('button', { name: 'Save assessment' }).click();
    await expect(page.getByText('Workflow saved and audit evidence persisted.', { exact: true })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('Evidence type').fill('QA acceptance evidence');
    await page.getByLabel('SHA-256 digest').fill('a'.repeat(64));
    await page.getByRole('button', { name: 'Submit evidence' }).click();
    await expect(page.getByText('1 evidence record', { exact: true })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('Approval rationale').fill('All required FRIA controls, independent assignments, monitoring and evidence were completed in this disposable QA workflow.');
    await page.getByRole('button', { name: 'Approve assessment' }).click();
    await expect(page.getByText('approved', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/FRIA workflow could not be completed/i)).toHaveCount(0);
  });
});
