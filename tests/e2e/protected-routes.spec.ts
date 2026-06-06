import { expect, test } from '@playwright/test';

const protectedRoutes = [
  '/en/dashboard/organizations',
  '/en/dashboard/organizations/team',
  '/en/dashboard/organizations/tasks',
  '/en/dashboard/organizations/documents',
  '/en/dashboard/organizations/vendors',
  '/en/dashboard/organizations/risks',
  '/en/dashboard/organizations/billing',
];

for (const route of protectedRoutes) {
  test(`redirects unauthenticated visitors from ${route} to login`, async ({ page }) => {
    await page.goto(route);

    await expect(page).toHaveURL(/\/login/);
  });
}
