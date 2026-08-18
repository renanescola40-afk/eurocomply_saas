import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const LEGACY_FRIA_ROUTE = new URL('../../src/app/[locale]/dashboard/assessments/[id]/fria/page.tsx', import.meta.url);
const FRIA_PRODUCT_E2E = new URL('../e2e/fria-product-acceptance.spec.ts', import.meta.url);
const FRIA_ROLE_LOCALE_E2E = new URL('../e2e/fria-role-locale-acceptance.spec.ts', import.meta.url);
const AUTHENTICATED_RESPONSIVE_E2E = new URL('../e2e/authenticated-responsive-accessibility.spec.ts', import.meta.url);
const FULL_SECURITY_SUITE = new URL('../../.github/workflows/full-security-suite.yml', import.meta.url);
const OBSOLETE_FRICTIONLESS_E2E = new URL('../e2e/fria-frictionless-population.spec.ts', import.meta.url);

describe('final Product + Commercial acceptance closure', () => {
  it('converges legacy assessment FRIA links on the canonical locale-aware workspace', async () => {
    const source = await readFile(LEGACY_FRIA_ROUTE, 'utf8');

    expect(source).toContain("import { redirect } from 'next/navigation';");
    expect(source).toContain("locales.includes(params.locale as Locale)");
    expect(source).toContain("new URLSearchParams({ assessment: params.id })");
    expect(source).toContain("redirect(`/${locale}/dashboard/fria?${query.toString()}`);");
  });

  it('keeps the active FRIA product contract on the consolidated workspace instead of the removed per-assessment page', async () => {
    const [productE2E, roleLocaleE2E] = await Promise.all([
      readFile(FRIA_PRODUCT_E2E, 'utf8'),
      readFile(FRIA_ROLE_LOCALE_E2E, 'utf8'),
    ]);

    expect(productE2E).toContain("page.goto('/en/dashboard/fria'");
    expect(roleLocaleE2E).toContain('/dashboard/assessments/${legacyAssessmentId}/fria');
    expect(roleLocaleE2E).toContain("new URL(page.url()).searchParams.get('assessment')");
    expect(roleLocaleE2E).toContain('/dashboard/fria');
    expect(existsSync(OBSOLETE_FRICTIONLESS_E2E)).toBe(false);
  });

  it('includes the FRIA workspace in authenticated mobile, tablet and desktop acceptance', async () => {
    const source = await readFile(AUTHENTICATED_RESPONSIVE_E2E, 'utf8');

    expect(source).toContain("['/en/dashboard/fria', 'FRIA workspace']");
    expect(source).toContain("{ label: 'mobile', width: 390, height: 844 }");
    expect(source).toContain("{ label: 'tablet', width: 768, height: 1024 }");
    expect(source).toContain("{ label: 'desktop', width: 1440, height: 1000 }");
    expect(source).toContain('expectNoHorizontalOverflow');
    expect(source).toContain('expectNoRuntimeError');
  });

  it('keeps the enterprise E2E gate bound to the repository-wide current Playwright suite, not a deleted historical spec', async () => {
    const workflow = await readFile(FULL_SECURITY_SUITE, 'utf8');

    expect(workflow).toContain('npm run test:e2e -- --reporter=line');
    expect(workflow).not.toContain('fria-frictionless-population.spec.ts');
    expect(workflow).toContain('Required production-like Playwright E2E gate');
  });
});
