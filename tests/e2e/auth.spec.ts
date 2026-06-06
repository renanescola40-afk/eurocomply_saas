import { expect, test } from '@playwright/test';

test('redirects unauthenticated dashboard visitors to login', async ({ page }) => {
  await page.goto('/en/dashboard');

  await expect(page).toHaveURL(/\/login/);
});
