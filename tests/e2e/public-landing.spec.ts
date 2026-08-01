import { expect, test, type Page } from '@playwright/test';

const localeExpectations = {
  en: {
    heading: /AI governance/i,
    inventory: /AI inventory|risk assessments/i,
    evidence: /evidence workflows|activity history/i,
  },
  pt: {
    heading: /governan[cç]a de IA/i,
    inventory: /inventário de IA|avaliações de risco/i,
    evidence: /workflows de evidência|histórico de atividade/i,
  },
  es: {
    heading: /gobernanza de IA/i,
    inventory: /inventario de IA|evaluaciones de riesgo/i,
    evidence: /flujos de evidencia|historial de actividad/i,
  },
  fr: {
    heading: /gouvernance IA/i,
    inventory: /inventaire IA|évaluations des risques/i,
    evidence: /workflows de preuves|historique d’activité/i,
  },
  it: {
    heading: /governance IA/i,
    inventory: /inventario IA|valutazioni del rischio/i,
    evidence: /workflow di evidenza|storico delle attività/i,
  },
  de: {
    heading: /KI-Governance/i,
    inventory: /KI-Inventar|Risikobewertungen/i,
    evidence: /Nachweisworkflows|Aktivitätshistorie/i,
  },
} as const;

type LandingLocale = keyof typeof localeExpectations;

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow, `${label} has horizontal overflow`).toBe(false);
}

async function expectProductionLanding(page: Page, locale: LandingLocale) {
  const response = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });
  const copy = localeExpectations[locale];

  expect(response?.status(), `${locale} landing should not 404`).not.toBe(404);
  expect(response?.status(), `${locale} landing should not server-error`).toBeLessThan(500);

  await expect(page.getByRole('link', { name: /RISCK COMPLY/i }).first()).toBeVisible();
  await expect(page.locator('main h1:visible').first()).toContainText(copy.heading);
  await expect(page.locator('body')).toContainText(copy.inventory);
  await expect(page.locator('body')).toContainText(copy.evidence);

  await expect(page.locator(`a[href="/${locale}/signup"]:visible`).first()).toBeVisible();
  await expect(page.locator(`a[href="/${locale}/login"]:visible`).first()).toBeVisible();
  await expect(page.locator(`a[href="/${locale}/pricing"]:visible`).first()).toBeVisible();
}

test.describe('public production landing', () => {
  for (const locale of Object.keys(localeExpectations) as LandingLocale[]) {
    test(`renders the ${locale.toUpperCase()} production landing`, async ({ page }) => {
      await expectProductionLanding(page, locale);
      await expectNoHorizontalOverflow(page, `${locale} production landing desktop`);
    });
  }

  test('keeps language options available on the public landing', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[aria-label="Select language"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/pt"]:visible').first()).toBeVisible();
  });

  test('routes primary conversion CTAs to authentication and pricing', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('a[href="/en/signup"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/en/login"]:visible').first()).toBeVisible();
    await expect(page.locator('a[href="/en/pricing"]:visible').first()).toBeVisible();
  });

  test('renders required production sections on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('One operational source of truth').first()).toBeVisible();
    await expect(page.getByText('From discovery to review').first()).toBeVisible();
    await expect(page.getByText('Controlled by design').first()).toBeVisible();
    await expect(page.locator('a[href="/en/signup"]:visible').first()).toBeVisible();
    await expectNoHorizontalOverflow(page, 'production landing mobile');
  });
});
