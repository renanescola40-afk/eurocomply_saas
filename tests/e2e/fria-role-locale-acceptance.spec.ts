import { expect, test } from '@playwright/test';

const roles = [
  { role: 'owner', env: 'E2E_OWNER_STORAGE_STATE', canManage: true },
  { role: 'admin', env: 'E2E_ADMIN_STORAGE_STATE', canManage: true },
  { role: 'member', env: 'E2E_MEMBER_STORAGE_STATE', canManage: false },
  { role: 'viewer', env: 'E2E_VIEWER_STORAGE_STATE', canManage: false },
] as const;

for (const fixture of roles) {
  test.describe(`FRIA ${fixture.role} presentation`, () => {
    const storageState = process.env[fixture.env];
    test.skip(!storageState, `${fixture.env} must point to a disposable paid QA fixture.`);
    if (storageState) test.use({ storageState });

    test('mutation and assignment controls match canonical governance permission', async ({ page }) => {
      await page.goto('/en/dashboard/fria', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);
      await expect(page.getByRole('heading', { name: 'FRIA workspace' })).toBeVisible();
      await expect(page.getByText(/reviewer uuid|approver uuid|legal reviewer uuid/i)).toHaveCount(0);

      const denied = page.getByText('FRIA management access is restricted', { exact: true });
      if (fixture.canManage) {
        await expect(denied).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Create assessment' })).toBeVisible();
      } else {
        await expect(denied).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create assessment' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Save assessment' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Submit evidence' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Approve assessment' })).toHaveCount(0);
      }
    });
  });
}

test.describe('FRIA six-locale presentation', () => {
  const storageState = process.env.E2E_OWNER_STORAGE_STATE;
  test.skip(!storageState, 'E2E_OWNER_STORAGE_STATE must point to a disposable paid-owner QA fixture.');
  if (storageState) test.use({ storageState });

  const locales = [
    ['en', 'FRIA workspace'],
    ['pt', 'Workspace FRIA'],
    ['es', 'Workspace FRIA'],
    ['fr', 'Espace FRIA'],
    ['it', 'Workspace FRIA'],
    ['de', 'FRIA-Workspace'],
  ] as const;

  for (const [locale, title] of locales) {
    test(`${locale} renders localized FRIA application chrome`, async ({ page }) => {
      await page.goto(`/${locale}/dashboard/fria`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Application error|Stack trace/i);
    });
  }
});
