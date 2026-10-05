import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const ownerEmail = process.env.E2E_FRIA_OWNER_EMAIL?.trim().toLowerCase();
const ownerPassword = process.env.E2E_FRIA_OWNER_PASSWORD;
const foreignEmail = process.env.E2E_UNLICENSED_OWNER_EMAIL?.trim().toLowerCase();
const foreignPassword = process.env.E2E_UNLICENSED_OWNER_PASSWORD;
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

async function login(page: Page, email: string, password: string) {
  await page.addInitScript(() => window.localStorage.setItem('risckcomply.analytics.consent', 'denied'));
  await page.goto('/en/login?next=%2Fen%2Fdashboard%2Fgap-analysis', { waitUntil: 'domcontentloaded' });
  const emailInput = page.getByRole('textbox', { name: 'Work email', exact: true });
  const form = page.locator('form').filter({ has: emailInput });
  await expect(form).toHaveCount(1);
  await emailInput.fill(email);
  await form.getByLabel('Password', { exact: true }).fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000, waitUntil: 'domcontentloaded' }),
    form.locator('button[type="submit"]').click(),
  ]);
}

async function postAssessment(context: BrowserContext) {
  const response = await context.request.post('/api/gap-analysis?operation=assessment', {
    headers: {
      Origin: new URL(baseURL).origin,
      'Content-Type': 'application/json',
    },
    data: {
      locale: 'en',
      score: 50,
      summary: {
        completed: 2,
        total: 2,
        byArticle: {
          'Article 9': { total: 25, score: 50, count: 2 },
        },
        openActions: 2,
        proof: 'v7_final_gap_analysis_runtime',
      },
      answers: [
        {
          question_id: 'art9-risk-process',
          article: 'Article 9',
          category: 'Risk management',
          answer: 'partial',
          score: 50,
          recommendation: 'Create and document an AI risk management process aligned with Article 9.',
        },
        {
          question_id: 'art9-mitigation',
          article: 'Article 9',
          category: 'Risk management',
          answer: 'partial',
          score: 50,
          recommendation: 'Define owners, review dates and evidence for each mitigation action.',
        },
      ],
    },
  });

  expect(response.status(), 'authenticated Gap Analysis assessment should persist').toBe(201);
  expect(response.headers()['cache-control'] ?? '').toMatch(/no-store/i);
  const payload = await response.json() as { assessmentId?: string };
  expect(payload.assessmentId).toMatch(/^[0-9a-f-]{36}$/i);
  return payload.assessmentId!;
}

test.describe('V7 authenticated Gap Analysis + PDF runtime proof', () => {
  test.skip(
    !ownerEmail || !ownerPassword || !foreignEmail || !foreignPassword,
    'Disposable licensed and foreign-tenant owner credentials are required.',
  );

  test('persists assessment, reloads it, generates a real PDF and denies foreign tenant access', async ({ browser }) => {
    test.setTimeout(90_000);

    const ownerContext = await browser.newContext({ baseURL });
    const ownerPage = await ownerContext.newPage();

    try {
      await login(ownerPage, ownerEmail!, ownerPassword!);

      const assessmentId = await postAssessment(ownerContext);

      const latest = await ownerContext.request.get('/api/gap-analysis?view=latest');
      expect(latest.status(), 'latest assessment read should succeed').toBe(200);
      expect(latest.headers()['cache-control'] ?? '').toMatch(/no-store/i);
      const latestPayload = await latest.json() as { assessment?: { id?: string; score?: number } | null };
      expect(latestPayload.assessment?.id).toBe(assessmentId);
      expect(latestPayload.assessment?.score).toBe(50);

      const report = await ownerContext.request.post('/api/gap-analysis/report', {
        headers: {
          Origin: new URL(baseURL).origin,
          'Content-Type': 'application/json',
        },
        data: { assessmentId, locale: 'en' },
      });

      expect(report.status(), 'saved assessment should generate a PDF').toBe(200);
      expect(report.headers()['content-type'] ?? '').toMatch(/application\/pdf/i);
      expect(report.headers()['content-disposition'] ?? '').toMatch(/RISCK-COMPLY_Gap-Analysis_.*\.pdf/i);
      expect(report.headers()['cache-control'] ?? '').toMatch(/private.*no-store|no-store.*private/i);
      const pdf = await report.body();
      expect(pdf.byteLength).toBeGreaterThan(500);
      expect(pdf.subarray(0, 4).toString('ascii')).toBe('%PDF');

      const foreignContext = await browser.newContext({ baseURL });
      const foreignPage = await foreignContext.newPage();
      try {
        await login(foreignPage, foreignEmail!, foreignPassword!);
        const foreignReport = await foreignContext.request.post('/api/gap-analysis/report', {
          headers: {
            Origin: new URL(baseURL).origin,
            'Content-Type': 'application/json',
          },
          data: { assessmentId, locale: 'en' },
        });
        expect(foreignReport.status(), 'foreign tenant must not read the saved assessment PDF').toBe(404);
        const denial = await foreignReport.json() as { error?: string };
        expect(denial.error).toBe('assessment_not_found');
      } finally {
        await foreignContext.close();
      }
    } finally {
      await ownerContext.close();
    }
  });
});
