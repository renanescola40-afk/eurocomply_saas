import { expect, test } from '@playwright/test';

const publicRoutes = [
  { path: '/en', heading: /RISCK COMPLY|Risck Comply|compliance/i },
  { path: '/en/pricing', heading: /pricing|plan/i },
];

for (const route of publicRoutes) {
  test(`renders public route ${route.path}`, async ({ page }) => {
    await page.goto(route.path);

    await expect(page).toHaveURL(new RegExp(route.path.replace('/', '\\/')));
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
  });
}
