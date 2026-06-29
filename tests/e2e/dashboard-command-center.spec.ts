import { expect, test, type Page } from '@playwright/test';

function credentialsFor(persona: string) {
  const prefix = `E2E_${persona.toUpperCase().replace(/-/g, '_')}`;
  return {
    email: process.env[`${prefix}_EMAIL`] ?? '',
    password: process.env[`${prefix}_PASSWORD`] ?? '',
  };
}

function skipWithoutCredentials(persona: string, credentials: { email: string; password: string }) {
  test.skip(!credentials.email || !credentials.password, `Set E2E_${persona.toUpperCase()}_EMAIL and E2E_${persona.toUpperCase()}_PASSWORD to run this dashboard smoke.`);
}

async function signIn(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/en/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password|palavra-passe|senha|contraseña|mot de passe|passwort/i).fill(credentials.password);
  await page.getByRole('button', { name: /sign in|entrar|connexion|accedi|anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/en\/login(?:$|[?#])/, { timeout: 15_000 });
}

test.describe('enterprise dashboard command center smoke', () => {
  test('owner can load the AI Act readiness cockpit without raw runtime errors', async ({ page }) => {
    const credentials = credentialsFor('owner');
    skipWithoutCredentials('owner', credentials);

    await signIn(page, credentials);
    const response = await page.goto('/en/dashboard/organizations', { waitUntil: 'domcontentloaded' });

    expect(response?.status(), 'dashboard should not 404').not.toBe(404);
    expect(response?.status(), 'dashboard should not return a server error').toBeLessThan(500);
    await expect(page.getByRole('heading', { name: /AI Act readiness cockpit/i })).toBeVisible();
    await expect(page.getByText(/Executive summary/i)).toBeVisible();
    await expect(page.getByText(/AI systems inventory summary/i)).toBeVisible();
    await expect(page.getByText(/Recommended next actions/i)).toBeVisible();
    await expect(page.getByText(/Plan limits/i)).toBeVisible();

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/Unhandled Runtime Error|Application error|Stack trace|ReferenceError:|TypeError:|SyntaxError:/i);
    expect(page.url()).not.toContain('/undefined');
  });
});
