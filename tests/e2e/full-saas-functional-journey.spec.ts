import { expect, test, type Page } from '@playwright/test';

const ownerStorageState = process.env.E2E_OWNER_STORAGE_STATE;
const ownerEmail = (process.env.E2E_OWNER_EMAIL ?? process.env.E2E_FRIA_OWNER_EMAIL)?.trim().toLowerCase();
const ownerPassword = process.env.E2E_OWNER_PASSWORD ?? process.env.E2E_FRIA_OWNER_PASSWORD;
const allowSyntheticWrites = process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES === 'true';
const ownerSessionConfigured = Boolean(ownerStorageState || (ownerEmail && ownerPassword));

if (ownerStorageState) test.use({ storageState: ownerStorageState });

async function expectHealthyPage(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not expose runtime errors`).not.toContainText(
    /Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace|NEXT_REDIRECT|webpack-internal/i,
  );
  expect(page.url(), `${label} should not navigate to undefined`).not.toContain('/undefined');
  expect(await page.locator('a[href="#"], a[href*="/undefined"]').count(), `${label} should not expose placeholder links`).toBe(0);
  const unnamedEnabledButtons = await page.locator('button:visible:not([disabled])').evaluateAll((buttons) =>
    buttons.map((button) => ({
      text: (button.textContent ?? '').replace(/\s+/g, ' ').trim(),
      aria: button.getAttribute('aria-label') ?? '',
      title: button.getAttribute('title') ?? '',
    })).filter((button) => !button.text && !button.aria && !button.title),
  );
  expect(unnamedEnabledButtons, `${label} should not expose enabled unnamed buttons`).toEqual([]);
}

async function loginWithCredentials(page: Page, email: string, password: string, next = '/en/dashboard/organizations') {
  await page.goto(`/en/login?next=${encodeURIComponent(next)}`, { waitUntil: 'domcontentloaded' });
  const emailInput = page.getByRole('textbox', { name: 'Work email', exact: true });
  const form = page.locator('form').filter({ has: emailInput });
  await expect(form).toHaveCount(1);
  await emailInput.fill(email);
  await form.getByLabel('Password', { exact: true }).fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000, waitUntil: 'domcontentloaded' }),
    form.locator('button[type="submit"]').click(),
  ]);
  await expectHealthyPage(page, 'credential login');
}

test.describe('full SaaS functional E2E closure', () => {
  test('account creation entry is actionable and keeps the paid onboarding continuation', async ({ page }) => {
    await page.goto('/en/signup?plan=professional&next=%2Fen%2Fonboarding%3Fplan%3Dprofessional', { waitUntil: 'domcontentloaded' });
    await expectHealthyPage(page, 'signup');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('form')).toHaveCount(1);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible();
  });

  test('real account creation reaches onboarding or the explicit email-verification handoff', async ({ page }) => {
    const email = `full-journey-signup-${Date.now()}@example.test`;
    const password = 'Rc!FullJourneySignup9a';
    await page.goto('/en/signup?plan=professional&next=%2Fen%2Fonboarding%3Fplan%3Dprofessional', { waitUntil: 'domcontentloaded' });
    await expectHealthyPage(page, 'signup mutation');

    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect.poll(async () => {
      const onOnboarding = /\/en\/onboarding(?:\?|$)/.test(new URL(page.url()).pathname + new URL(page.url()).search);
      const verificationVisible = await page.getByRole('heading', { name: /verify your email/i }).isVisible().catch(() => false);
      return onOnboarding || verificationVisible;
    }, { timeout: 20_000 }).toBe(true);

    if (page.url().includes('/en/onboarding')) {
      await expectHealthyPage(page, 'post-signup onboarding');
      expect(page.url()).toContain('plan=professional');
    } else {
      await expect(page.getByRole('heading', { name: /verify your email/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    }
  });

  test.describe('licensed owner journey', () => {
    test.skip(!ownerSessionConfigured, 'Provide E2E_OWNER_STORAGE_STATE or disposable owner email/password credentials.');

    test('workspace → inventory → assessment → documents → monitoring → settings → billing has no dead surface', async ({ page }) => {
      test.setTimeout(120_000);
      if (!ownerStorageState) await loginWithCredentials(page, ownerEmail!, ownerPassword!);

      const routeSpine = [
        ['/en/dashboard/organizations', 'workspace'],
        ['/en/ai-systems', 'AI inventory and classification'],
        ['/en/dashboard/fria', 'assessment'],
        ['/en/dashboard/organizations/documents', 'documents'],
        ['/en/dashboard/organizations/reports-governance/news', 'regulatory monitoring'],
        ['/en/settings', 'settings redirect'],
        ['/en/profile', 'personal settings'],
        ['/en/dashboard/organizations/billing', 'billing'],
      ] as const;

      for (const [route, label] of routeSpine) {
        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
        expect(response?.status(), `${label} should not 404`).not.toBe(404);
        expect(response?.status(), `${label} should not server-error`).toBeLessThan(500);
        await expectHealthyPage(page, label);
        expect(page.url(), `${label} should remain authenticated`).not.toContain('/login');
      }

      await page.goto('/en/dashboard/fria', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: /create assessment/i })).toBeVisible();

      await page.goto('/en/dashboard/organizations/reports-governance/news', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/Regulatory Intelligence/i);

      await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();

      await page.goto('/en/dashboard/organizations/billing', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
    });

    test('inventory classification and reassessment persist after refresh', async ({ page }) => {
      test.skip(!allowSyntheticWrites, 'Synthetic writes require E2E_ALLOW_SYNTHETIC_APP_WRITES=true on disposable QA.');
      test.setTimeout(90_000);
      if (!ownerStorageState) await loginWithCredentials(page, ownerEmail!, ownerPassword!);

      const uniqueName = `QA Full Journey AI ${Date.now()}`;
      const updatedName = `${uniqueName} reassessed`;

      await page.goto('/en/ai-systems', { waitUntil: 'domcontentloaded' });
      await expectHealthyPage(page, 'AI inventory write');
      await page.getByPlaceholder(/system name/i).fill(uniqueName);
      await page.getByPlaceholder(/example: summarises/i).fill('Synthetic disposable QA assistant used to validate persisted inventory classification and reassessment.');
      await page.getByRole('button', { name: /classify and save/i }).click();
      await expect(page.getByText(uniqueName, { exact: true })).toBeVisible({ timeout: 20_000 });

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByText(uniqueName, { exact: true })).toBeVisible();

      const card = page.locator('article').filter({ hasText: uniqueName }).first();
      await card.getByRole('link', { name: /review|detail/i }).click();
      await expectHealthyPage(page, 'AI assessment detail');
      await page.getByLabel(/system name/i).fill(updatedName);
      await page.getByLabel(/lifecycle status/i).selectOption('retired');
      await page.getByRole('button', { name: /save reassessment/i }).click();
      await expect(page.getByLabel(/system name/i)).toHaveValue(updatedName);
      await expect(page.getByRole('status')).toBeVisible();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByLabel(/system name/i)).toHaveValue(updatedName);
      await expect(page.getByLabel(/lifecycle status/i)).toHaveValue('retired');
    });

    test('generated document persists, exposes a real signed download action and cleans up', async ({ page }) => {
      test.skip(!allowSyntheticWrites, 'Synthetic writes require E2E_ALLOW_SYNTHETIC_APP_WRITES=true on disposable QA.');
      test.setTimeout(90_000);
      if (!ownerStorageState) await loginWithCredentials(page, ownerEmail!, ownerPassword!);

      const documentName = `QA Full Journey evidence ${Date.now()}`;
      await page.goto('/en/dashboard/organizations/templates', { waitUntil: 'domcontentloaded' });
      await expectHealthyPage(page, 'document template library');

      const templateCard = page.locator('article').filter({ hasText: /Task \+ document/i }).first();
      await expect(templateCard).toBeVisible();
      await templateCard.getByText('Generate evidence document', { exact: true }).click();
      await templateCard.getByLabel('Document title').fill(documentName);
      await Promise.all([
        page.waitForURL(/\/en\/dashboard\/organizations\/documents(?:\?|$)/, { timeout: 30_000, waitUntil: 'domcontentloaded' }),
        templateCard.getByRole('button', { name: 'Generate evidence document' }).click(),
      ]);
      await expect(page.getByText(documentName, { exact: true })).toBeVisible({ timeout: 20_000 });

      await page.reload({ waitUntil: 'domcontentloaded' });
      const documentCard = page.locator('article').filter({ hasText: documentName }).first();
      await expect(documentCard.getByRole('button', { name: /download/i })).toBeVisible();

      const appOrigin = new URL(page.url()).origin;
      const signedNavigation = page.waitForURL(
        (url) => url.origin !== appOrigin || /\/storage\/v1\/object\//.test(url.pathname),
        { timeout: 20_000, waitUntil: 'commit' },
      ).catch(() => null);
      await documentCard.getByRole('button', { name: /download/i }).click();
      expect(await signedNavigation, 'download should leave the app for a signed artifact URL').not.toBeNull();

      await page.goto('/en/dashboard/organizations/documents', { waitUntil: 'domcontentloaded' });
      const cleanupCard = page.locator('article').filter({ hasText: documentName }).first();
      page.once('dialog', (dialog) => void dialog.accept());
      await cleanupCard.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText(documentName, { exact: true })).toHaveCount(0);
    });

    test('printable report invokes the browser print pipeline instead of a placeholder anchor', async ({ page }) => {
      if (!ownerStorageState) await loginWithCredentials(page, ownerEmail!, ownerPassword!);
      await page.goto('/en/document-generator', { waitUntil: 'domcontentloaded' });
      await expectHealthyPage(page, 'document generator');

      const printButton = page.getByRole('button', { name: /open printable report/i });
      if (await printButton.count() === 0) {
        await expect(page.getByRole('link', { name: /upgrade to print report/i })).toBeVisible();
        return;
      }

      await page.evaluate(() => {
        Object.defineProperty(window, 'print', {
          configurable: true,
          value: () => document.documentElement.setAttribute('data-e2e-print-called', 'true'),
        });
      });
      await printButton.click();
      await expect(page.locator('html')).toHaveAttribute('data-e2e-print-called', 'true');
    });

    test('logout clears the session and credential login restores product access', async ({ page }) => {
      test.skip(!ownerEmail || !ownerPassword, 'Disposable owner email/password credentials are required to prove logout → login.');
      test.setTimeout(60_000);
      if (!ownerStorageState) await loginWithCredentials(page, ownerEmail!, ownerPassword!);

      await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/\/en\/login(?:\?|$)/, { timeout: 20_000 });

      await page.goto('/en/dashboard/organizations', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/en\/login\?next=/);

      await loginWithCredentials(page, ownerEmail!, ownerPassword!);
      await page.goto('/en/dashboard/organizations', { waitUntil: 'domcontentloaded' });
      await expectHealthyPage(page, 're-authenticated workspace');
      expect(page.url()).not.toContain('/login');
    });
  });
});
