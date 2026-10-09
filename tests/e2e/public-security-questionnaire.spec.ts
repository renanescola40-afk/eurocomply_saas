import { expect, test } from '@playwright/test';

test.describe('public enterprise security questionnaire', () => {
  test('renders the canonical English buyer page without unsupported claims', async ({ page }) => {
    const response = await page.goto('/en/trust/security-questionnaire', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/en\/trust\/security-questionnaire\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('main').getByText(/SOC 2 or ISO 27001 certification is claimed/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /JSON/i })).toHaveAttribute('href', '/api/trust/security-questionnaire');
  });

  test('returns sanitized machine-readable answers', async ({ request }) => {
    const response = await request.get('/api/trust/security-questionnaire');
    expect(response.ok()).toBe(true);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');

    const body = await response.json();
    expect(body.product).toBe('RISCK COMPLY');
    expect(body.answers.length).toBeGreaterThanOrEqual(10);
    expect(JSON.stringify(body)).not.toContain('service_role');
    expect(body.answers.every((answer: { evidence: string[] }) => answer.evidence.every((url) => url.startsWith('http')))).toBe(true);
  });
});
