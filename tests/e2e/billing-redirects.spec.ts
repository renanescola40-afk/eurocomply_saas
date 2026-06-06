import { expect, test } from '@playwright/test';

const billingUrls = [
  '/en/dashboard/organizations/billing?checkout=success',
  '/en/dashboard/organizations/billing?checkout=cancelled',
];

for (const url of billingUrls) {
  test(`redirects unauthenticated billing URL ${url} to login`, async ({ page }) => {
    await page.goto(url);

    await expect(page).toHaveURL(/\/login/);
  });
}
