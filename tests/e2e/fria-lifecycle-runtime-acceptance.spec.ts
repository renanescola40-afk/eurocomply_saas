import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ownerStorageState = process.env.E2E_OWNER_STORAGE_STATE;
const approverStorageState = process.env.E2E_FRIA_APPROVER_STORAGE_STATE;
const ownerEmail = process.env.E2E_FRIA_OWNER_EMAIL?.trim().toLowerCase();
const ownerPassword = process.env.E2E_FRIA_OWNER_PASSWORD;
const reviewerEmail = process.env.E2E_FRIA_REVIEWER_EMAIL?.trim().toLowerCase();
const approverEmail = process.env.E2E_FRIA_APPROVER_EMAIL?.trim().toLowerCase();
const approverPassword = process.env.E2E_FRIA_APPROVER_PASSWORD;
const unlicensedOwnerEmail = process.env.E2E_UNLICENSED_OWNER_EMAIL?.trim().toLowerCase();
const unlicensedOwnerPassword = process.env.E2E_UNLICENSED_OWNER_PASSWORD;
const allowSyntheticWrites = process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true';
const commercialAuthorityVerified = process.env.E2E_FRIA_COMMERCIAL_AUTHORITY_VERIFIED === 'true';
const evidenceVaultSchemaVerified = process.env.E2E_FRIA_EVIDENCE_VAULT_SCHEMA_VERIFIED === 'true';
const unlicensedAuthorityVerified = process.env.E2E_FRIA_UNLICENSED_AUTHORITY_VERIFIED === 'true';
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const evidencePath = process.env.E2E_FRIA_RUNTIME_EVIDENCE_PATH?.trim();
const ownerSessionConfigured = Boolean(ownerStorageState || (ownerEmail && ownerPassword));
const approverSessionConfigured = Boolean(approverStorageState || (approverEmail && approverPassword));
const unlicensedSessionConfigured = Boolean(unlicensedOwnerEmail && unlicensedOwnerPassword);
const analyticsConsentStorageKey = 'risckcomply.analytics.consent';

async function startWithAnalyticsDenied(page: Page) {
  await page.addInitScript((storageKey) => window.localStorage.setItem(storageKey, 'denied'), analyticsConsentStorageKey);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeRuntimeEvidence() {
  if (!evidencePath) return;
  const evidence = {
    schema: 'risck-comply.product-fria-runtime-acceptance.v2',
    outcome: 'passed',
    generatedAt: new Date().toISOString(),
    targetSha: process.env.EXPECTED_HEAD_SHA ?? process.env.GITHUB_SHA ?? null,
    environment: process.env.GITHUB_ACTIONS === 'true' ? 'github-actions-disposable-qa' : 'disposable-qa',
    checks: {
      localizedPricingRendered: true,
      publicPricingRendered: true,
      professionalPlanCtaRendered: true,
      trustCenterRendered: true,
      publicStatusRendered: true,
      commercialAuthorityVerified,
      unlicensedAuthorityVerified,
      unlicensedPaidDashboardDenied: true,
      unlicensedTopLevelProductDenied: true,
      unlicensedBillingRecoveryReachable: true,
      evidenceVaultSchemaVerified,
      ownerAuthenticated: true,
      legacyHomeConvergedToEnterpriseShell: true,
      enterpriseShellRendered: true,
      responsiveShellVerified: true,
      topLevelAiSystemUsesEnterpriseShell: true,
      aiSystemCreated: true,
      assessmentCreated: true,
      humanReviewerAssigned: true,
      distinctApproverAssigned: true,
      legalReviewCompleted: true,
      fria01EvidenceSubmitted: true,
      fria15EvidenceSubmitted: true,
      evidenceVaultRendered: true,
      evidenceVaultItemCreated: true,
      approverAuthenticatedSeparately: true,
      approvalPersisted: true,
      approvedStateImmutable: true,
    },
    evidenceIntegrity: {
      syntheticWritesExplicitlyEnabled: allowSyntheticWrites,
      credentialsStored: false,
      emailsStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
      rawProviderResponsesStored: false,
    },
  };
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

async function expectHealthyPublicPage(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not expose runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i,
  );
  expect(page.url(), `${label} should not navigate to undefined`).not.toContain('/undefined');
}

async function expectHealthyAuthenticatedPage(page: Page, label: string) {
  await expectHealthyPublicPage(page, label);
  expect(page.url(), `${label} should not fall back to login`).not.toContain('/login');
  expect(page.url(), `${label} should not fall back to pricing`).not.toContain('/pricing');
  expect(page.url(), `${label} should not fall back to checkout`).not.toContain('/checkout');
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth, `${label} should not create document-level horizontal overflow`).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
}

async function loginWithDisposableCredentials(page: Page, email: string, password: string) {
  await page.goto('/en/login?next=/en/dashboard/organizations', { waitUntil: 'domcontentloaded' });
  const credentialEmail = page.getByRole('textbox', { name: 'Work email', exact: true });
  const credentialForm = page.locator('form').filter({ has: credentialEmail });
  await expect(credentialForm, 'credential login form should be uniquely addressable beside Enterprise SSO').toHaveCount(1);
  await credentialEmail.fill(email);
  await credentialForm.getByLabel('Password', { exact: true }).fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000, waitUntil: 'domcontentloaded' }),
    credentialForm.locator('button[type="submit"]').click(),
  ]);
  await expectHealthyAuthenticatedPage(page, 'disposable authenticated session');
}

async function loginUnlicensedWithDisposableCredentials(page: Page, email: string, password: string) {
  await page.goto('/en/login?next=/en/dashboard/organizations/billing', { waitUntil: 'domcontentloaded' });
  const credentialEmail = page.getByRole('textbox', { name: 'Work email', exact: true });
  const credentialForm = page.locator('form').filter({ has: credentialEmail });
  await expect(credentialForm, 'unlicensed credential login form should remain uniquely addressable').toHaveCount(1);
  await credentialEmail.fill(email);
  await credentialForm.getByLabel('Password', { exact: true }).fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000, waitUntil: 'domcontentloaded' }),
    credentialForm.locator('button[type="submit"]').click(),
  ]);
  await expectHealthyPublicPage(page, 'unlicensed authenticated session');
  expect(page.url()).not.toContain('/login');
}

async function expectCommercialRecovery(page: Page, label: string) {
  await expectHealthyPublicPage(page, label);
  await expect(page).toHaveURL(/\/en\/pricing\?billing=subscription_required(?:&|$)/);
  expect(page.url(), `${label} should remain outside paid product content`).not.toContain('/dashboard/organizations?');
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
  test.skip(!ownerSessionConfigured, 'Provide E2E_OWNER_STORAGE_STATE or disposable owner email/password credentials.');
  test.skip(!approverSessionConfigured, 'Provide E2E_FRIA_APPROVER_STORAGE_STATE or disposable approver credentials.');
  test.skip(!unlicensedSessionConfigured, 'Provide disposable unlicensed owner credentials for the final commercial-boundary regression.');
  test.skip(!reviewerEmail, 'E2E_FRIA_REVIEWER_EMAIL must identify an eligible non-owner governance reviewer.');
  test.skip(!approverEmail, 'E2E_FRIA_APPROVER_EMAIL must identify an eligible non-owner governance approver.');
  test.skip(
    Boolean(reviewerEmail && approverEmail && reviewerEmail === approverEmail),
    'FRIA reviewer and approver must be distinct identities.',
  );
  test.skip(!allowSyntheticWrites, 'Synthetic FRIA writes require E2E_ALLOW_SYNTHETIC_APP_WRITES=true on disposable QA.');
  test.skip(!commercialAuthorityVerified, 'Disposable QA must verify a durable Professional commercial authority before browser acceptance.');
  test.skip(!unlicensedAuthorityVerified, 'Disposable QA must verify the unlicensed tenant has no active commercial authority.');
  test.skip(!evidenceVaultSchemaVerified, 'Disposable QA must verify the organization-scoped Evidence Vault schema before browser acceptance.');

  if (ownerStorageState) test.use({ storageState: ownerStorageState });

  test('visitor and unlicensed customer respect the commercial boundary; licensed owner completes the enterprise FRIA journey', async ({ page, browser }) => {
    test.setTimeout(180_000);
    const systemName = `QA FRIA system ${Date.now()}`;
    const evidenceVaultTitle = `QA Evidence Vault ${Date.now()}`;
    await startWithAnalyticsDenied(page);

    // Public acquisition, i18n and Trust surfaces must remain reachable outside
    // the paid-product boundary on the exact assessed SHA.
    await page.goto('/pt/pricing', { waitUntil: 'domcontentloaded' });
    await expectHealthyPublicPage(page, 'localized public pricing');
    await expect(page).toHaveURL(/\/pt\/pricing(?:\?|$)/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Comece pela preparação de IA/i);

    await page.goto('/en/security', { waitUntil: 'domcontentloaded' });
    await expectHealthyPublicPage(page, 'public Trust Center');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/en/status', { waitUntil: 'domcontentloaded' });
    await expectHealthyPublicPage(page, 'public status authority');
    await expect(page.locator('a[href*="statuspage.io"]').first()).toBeVisible();

    await page.goto('/en/pricing', { waitUntil: 'domcontentloaded' });
    await expectHealthyPublicPage(page, 'public pricing');
    await expect(page).toHaveURL(/\/en\/pricing(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Professional', exact: true })).toBeVisible();
    await expect(page.locator('a[href="/en/signup?plan=professional"]').first()).toBeVisible();

    // A real authenticated organization with membership but no durable commercial
    // authority must fail closed on both dashboard and legacy top-level paid routes,
    // while the billing-recovery surface remains available to purchase or recover.
    const unlicensedContext = await browser.newContext({ baseURL });
    try {
      const unlicensedPage = await unlicensedContext.newPage();
      await startWithAnalyticsDenied(unlicensedPage);
      await loginUnlicensedWithDisposableCredentials(unlicensedPage, unlicensedOwnerEmail!, unlicensedOwnerPassword!);

      await unlicensedPage.goto('/en/dashboard/organizations', { waitUntil: 'domcontentloaded' });
      await expectCommercialRecovery(unlicensedPage, 'unlicensed dashboard access');

      await unlicensedPage.goto('/en/ai-systems', { waitUntil: 'domcontentloaded' });
      await expectCommercialRecovery(unlicensedPage, 'unlicensed top-level AI systems access');

      await unlicensedPage.goto('/en/dashboard/organizations/billing', { waitUntil: 'domcontentloaded' });
      await expectHealthyPublicPage(unlicensedPage, 'unlicensed billing recovery');
      await expect(unlicensedPage).toHaveURL(/\/en\/dashboard\/organizations\/billing(?:\?|$)/);
      expect(unlicensedPage.url()).not.toContain('/login');
    } finally {
      await unlicensedContext.close();
    }

    if (!ownerStorageState) {
      await loginWithDisposableCredentials(page, ownerEmail!, ownerPassword!);
    }

    // Legacy authenticated bookmarks must converge into the canonical enterprise
    // dashboard instead of resurfacing the retired standalone dashboard template.
    await page.goto('/en/risck-comply-home', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/dashboard\/organizations(?:\?|$)/);
    await expectHealthyAuthenticatedPage(page, 'legacy home convergence');

    // The authenticated product must enter through the final enterprise dashboard
    // shell before the same user continues into AI governance and FRIA workflows.
    const shellNavigation = page.getByRole('navigation', { name: 'Enterprise dashboard navigation', exact: true });
    await expect(page.getByRole('link', { name: 'RISCK COMPLY — Dashboard', exact: true })).toBeVisible();
    await expect(shellNavigation).toBeVisible();
    await expect(shellNavigation.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(shellNavigation.getByRole('link', { name: 'Evidence vault', exact: true })).toBeVisible();

    // Regress the final shell at the three product acceptance breakpoints. This is
    // intentionally a no-write pass: it validates layout integrity, runtime health
    // and document-level overflow without manufacturing product records.
    for (const viewport of [
      { label: 'mobile', width: 390, height: 844 },
      { label: 'tablet', width: 768, height: 1024 },
      { label: 'desktop', width: 1440, height: 1000 },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en/dashboard/organizations', { waitUntil: 'domcontentloaded' });
      await expectHealthyAuthenticatedPage(page, `${viewport.label} enterprise dashboard`);
      await expect(page.getByRole('main').first()).toBeVisible();
      await expectNoHorizontalOverflow(page, `${viewport.label} enterprise dashboard`);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/en/ai-systems', { waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'AI inventory prerequisite');
    await expect(page.getByRole('navigation', { name: 'Enterprise dashboard navigation', exact: true })).toBeVisible();
    const aiSystemForm = page.locator('form:visible').filter({
      has: page.getByRole('textbox', { name: 'System name', exact: true }),
    });
    await expect(aiSystemForm, 'AI system registration form should be uniquely visible').toHaveCount(1);
    await aiSystemForm.getByRole('textbox', { name: 'System name', exact: true }).fill(systemName);
    await aiSystemForm.getByPlaceholder(/example: summarises/i).fill(
      'Synthetic disposable QA system used only to prove the FRIA lifecycle and separation of functions.',
    );
    await aiSystemForm.getByRole('button', { name: /classify and save/i }).click();
    await expect(page.getByRole('heading', { name: systemName, exact: true })).toBeVisible();

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

    // Prove the workflow survived a fresh authenticated browser read instead of binding
    // runtime acceptance to a transient notification that is cleared by revalidation.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'FRIA persisted workflow refresh');
    const persistedAssessment = page.getByRole('button').filter({ hasText: systemName }).first();
    await expect(persistedAssessment).toBeVisible();
    await persistedAssessment.click();
    await expect(page.locator('#fria-applicability')).toHaveValue('not_required');
    await expect(page.locator('#fria-reviewer')).toHaveValue(reviewerId);
    await expect(page.locator('#fria-approver')).toHaveValue(approverId);
    await expect(page.locator('#fria-legal-reviewer')).toHaveValue(reviewerId);
    await expect(page.getByLabel('Legal review completed')).toBeChecked();

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

    // Close the wider Product evidence loop against the same tenant and exact
    // disposable database. This catches Evidence Vault UI/RLS regressions that
    // FRIA-specific evidence records alone cannot detect.
    await page.goto('/en/dashboard/evidence', { waitUntil: 'domcontentloaded' });
    await expectHealthyAuthenticatedPage(page, 'Evidence Vault owner workspace');
    await expect(page).toHaveURL(/\/en\/dashboard\/evidence(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Audit evidence center', exact: true })).toBeVisible();
    await page.getByPlaceholder('Evidence title', { exact: true }).fill(evidenceVaultTitle);
    await page.getByPlaceholder('Owner or team', { exact: true }).fill('Product Runtime QA');
    await page.getByPlaceholder(/Articles, e\.g\./i).fill('Article 9, Article 14');
    await page.getByRole('button', { name: 'Add evidence', exact: true }).click();
    await expect(page.getByText(evidenceVaultTitle, { exact: true })).toBeVisible();

    const approverContext = await browser.newContext({
      ...(approverStorageState ? { storageState: approverStorageState } : {}),
      baseURL,
    });

    try {
      const approverPage = await approverContext.newPage();
      await startWithAnalyticsDenied(approverPage);
      if (!approverStorageState) {
        await loginWithDisposableCredentials(approverPage, approverEmail!, approverPassword!);
      }
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
      writeRuntimeEvidence();
    } finally {
      await approverContext.close();
    }
  });
});