import { expect, test, type Page } from '@playwright/test';

const ownerStorageState = process.env.E2E_OWNER_STORAGE_STATE;

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth, `${label} should not create document-level horizontal overflow`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectNoRuntimeError(page: Page, label: string) {
  await expect(page.locator('body'), `${label} body should render`).toBeVisible();
  await expect(page.locator('body'), `${label} should not expose runtime errors`).not.toContainText(/Unhandled Runtime Error|Application error|ReferenceError:|TypeError:|SyntaxError:|Stack trace/i);
  expect(page.url(), `${label} should stay authenticated`).not.toContain('/login');
}

test.describe('authenticated responsive and accessibility acceptance', () => {
  test.skip(!ownerStorageState, 'E2E_OWNER_STORAGE_STATE must point to a disposable paid-owner QA fixture.');
  if (ownerStorageState) test.use({ storageState: ownerStorageState });

  const routes = [
    ['/en/dashboard/organizations', 'dashboard'],
    ['/en/dashboard/organizations/tasks', 'tasks'],
    ['/en/dashboard/organizations/documents', 'documents'],
    ['/en/dashboard/organizations/team', 'team'],
    ['/en/ai-systems', 'AI systems'],
  ] as const;

  const viewports = [
    { label: 'mobile', width: 390, height: 844 },
    { label: 'tablet', width: 768, height: 1024 },
    { label: 'desktop', width: 1440, height: 1000 },
  ] as const;

  for (const viewport of viewports) {
    test(`${viewport.label} core recurring workflows stay usable without document overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const [route, label] of routes) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expectNoRuntimeError(page, `${viewport.label} ${label}`);
        await expectNoHorizontalOverflow(page, `${viewport.label} ${label}`);
        await expect(page.locator('main')).toBeVisible();
      }
    });
  }

  test('keyboard can reach and operate the task creation form without pointer input', async ({ page }) => {
    await page.goto('/en/dashboard/organizations/tasks', { waitUntil: 'domcontentloaded' });
    await expectNoRuntimeError(page, 'keyboard tasks');

    const title = page.getByLabel('Title').first();
    await title.focus();
    await expect(title).toBeFocused();
    await title.fill('Keyboard focus probe');

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Description').first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Category').first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Priority').first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Due date').first()).toBeFocused();

    // Do not submit: this test validates focus order without creating persistent QA data.
    await expect(page.getByRole('button', { name: 'Create task' })).toBeEnabled();
  });

  test('document upload and team invitation controls expose explicit accessible names', async ({ page }) => {
    await page.goto('/en/dashboard/organizations/documents', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Category')).toBeVisible();
    await expect(page.getByLabel('File')).toBeVisible();
    await expect(page.getByLabel('Expiration date')).toBeVisible();

    await page.goto('/en/dashboard/organizations/team', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /send invitation/i })).toBeVisible();
  });
});
