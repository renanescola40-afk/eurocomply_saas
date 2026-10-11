import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('English-only canonical customer surface', () => {
  it('forces historical non-English routes to canonical English', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).toContain("localeSegment !== 'en'");
    expect(middleware).toContain('NextResponse.redirect(redirectUrl, 308)');
    expect(middleware).toContain("response.cookies.set(LOCALE_COOKIE, 'en'");
  });

  it('does not let a historical locale cookie select a non-English route', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).toContain('function detectLocale(_req: NextRequest): string');
    expect(middleware).toContain('return defaultLocale;');
  });

  it('exposes English only from both language switchers', () => {
    expect(read('src/components/LanguageSwitcher.tsx')).toContain("(['en'] as const).map");
    expect(read('src/components/i18n/language-switcher.tsx')).toContain("(['en'] as const).map");
  });

  it('forces transactional recipient locale resolution to English', () => {
    const recipientLocale = read('src/lib/i18n/recipient-locale.ts');
    expect(recipientLocale).toContain('return RECIPIENT_LOCALE_FALLBACK;');
    expect(recipientLocale).not.toContain('locales.includes');
  });

  it('uses the canonical English recovery entrypoint', () => {
    expect(read('src/app/[locale]/login/page.tsx')).toContain('recover-password');
    expect(read('src/app/[locale]/recover-password/page.tsx')).toContain("export { default } from '../recuperar-senha/page';");
  });
  it('makes English the sole normalized runtime locale', () => {
    const locales = read('src/lib/i18n/locales.ts');
    expect(locales).toContain("return 'en';");
  });

  it('keeps runtime translation and onboarding errors English-only', () => {
    const translator = read('src/components/i18n/global-runtime-translator.tsx');
    const onboarding = read('src/lib/onboarding/action-failure.ts');
    expect(translator).toContain('const target = row.en;');
    expect(onboarding).toContain('const isPt = false;');
  });


  it('keeps direct customer-facing residual surfaces English-only', () => {
    const approvals = read('src/app/[locale]/aprovacoes/approvals-client.tsx');
    const legacyOrganizations = read('src/app/[locale]/dashboard/organizations/clerk/page.tsx');

    expect(approvals).toContain("submittedAt: 'Today'");
    expect(approvals).toContain("submittedAt: 'Yesterday'");
    expect(approvals).toContain("submittedAt: 'This week'");
    expect(approvals).not.toContain("submittedAt: 'Hoje'");
    expect(approvals).not.toContain("submittedAt: 'Ontem'");
    expect(approvals).not.toContain("submittedAt: 'Esta semana'");

    expect(legacyOrganizations).toContain('Legacy flow retired');
    expect(legacyOrganizations).toContain('Centralized organization management');
    expect(legacyOrganizations).toContain('Open organizations');
    expect(legacyOrganizations).not.toContain('Fluxo legado retirado');
    expect(legacyOrganizations).not.toContain('Gestão centralizada de organizações');
  });

  it('keeps authenticated secondary surfaces on canonical English runtime copy', () => {
    const surfaces = [
      'src/app/[locale]/dashboard/executive/page.tsx',
      'src/app/[locale]/dashboard/board-report/page.tsx',
      'src/app/[locale]/dashboard/audit-pack/page.tsx',
      'src/app/[locale]/dashboard/evidence/evidence-vault-client.tsx',
      'src/app/[locale]/dashboard/legal-assurance/page.tsx',
      'src/app/[locale]/dashboard/legal-assurance/[reviewId]/page.tsx',
      'src/app/[locale]/counsel/[reviewId]/page.tsx',
    ];

    for (const surface of surfaces) {
      const source = read(surface);
      expect(source, surface).toMatch(/const locale[^\n]*= 'en';/);
      expect(source, surface).toContain('copy.en');
      expect(source, surface).not.toContain(" : 'pt') as Locale");
    }

    const login = read('src/app/[locale]/login/page.tsx');
    expect(login).toContain("return 'Forgot your password?';");
    expect(login).not.toContain("'Esqueceu a senha?'");
  });

  it('keeps billing, add-ons and onboarding runtime selectors pinned to English', () => {
    const addOns = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');
    const billingPage = read('src/app/[locale]/dashboard/organizations/billing/page.tsx');
    const billingView = read('src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx');
    const billingIntent = read('src/app/[locale]/dashboard/organizations/billing/billing-plan-intent-banner.tsx');
    const billingAction = read('src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx');
    const onboarding = read('src/app/[locale]/onboarding/page.tsx');
    const onboardingBoundary = read('src/components/onboarding/onboarding-runtime-boundary.tsx');
    const onboardingProgress = read('src/components/onboarding/onboarding-progress-card.tsx');

    expect(addOns).toContain("getAddOnsCopy('en')");
    expect(addOns).toContain("commerceCopy('en')");
    expect(billingPage).toContain("getPublicBillingFailureMessage('en')");
    expect(billingView).toContain("const activeLocale: Locale = 'en';");
    expect(billingView).toContain('const copy = billingCopy.en;');
    expect(billingIntent).toContain('const copy = copyByLocale.en;');
    expect(billingAction).toContain("const copy = getStepUpCopy('en');");
    expect(billingAction).toContain("const legalCopy = getLegalAcceptanceCopy('en');");
    expect(billingAction).toContain("getPublicPaidGaUnavailableCopy('en')");
    expect(onboarding).toContain("getPurchaseCopy('en')");
    expect(onboarding).toContain("getCommercialSurfaceCopy('en').pricing");
    expect(onboardingBoundary).toContain('const isPt = false;');
    expect(onboardingProgress).toContain('return compactCopy.en;');
  });

  it('uses English as the sole application dictionary', () => {
    const appDictionary = read('src/lib/i18n/app-dictionary.ts');
    expect(appDictionary).toContain('return dictionaries.en;');
  });

});
