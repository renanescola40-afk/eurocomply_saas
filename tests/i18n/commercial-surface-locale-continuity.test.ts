import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { commercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';

const pricingPage = readFileSync(join(process.cwd(), 'src/app/[locale]/pricing/page.tsx'), 'utf8');
const checkoutPage = readFileSync(join(process.cwd(), 'src/app/[locale]/checkout/page.tsx'), 'utf8');
const loginPage = readFileSync(join(process.cwd(), 'src/app/[locale]/login/page.tsx'), 'utf8');
const signupPage = readFileSync(join(process.cwd(), 'src/app/[locale]/signup/page.tsx'), 'utf8');
const aiSystemsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/ai-systems/ai-systems-client.tsx'), 'utf8');
const onboardingFlow = readFileSync(join(process.cwd(), 'src/components/onboarding/b2b-onboarding-flow.tsx'), 'utf8');
const trustPage = readFileSync(join(process.cwd(), 'src/app/[locale]/trust/page.tsx'), 'utf8');
const trustComponent = readFileSync(join(process.cwd(), 'src/components/marketing/trust-center-page.tsx'), 'utf8');
const consentBanner = readFileSync(join(process.cwd(), 'src/components/analytics/AnalyticsConsentBanner.tsx'), 'utf8');
const posthogClient = readFileSync(join(process.cwd(), 'src/lib/analytics/posthog-client.ts'), 'utf8');

describe('commercial surface locale continuity', () => {
  it('defines complete purchase/auth/consent copy for every configured locale', () => {
    expect(Object.keys(commercialSurfaceCopy).sort()).toEqual([...locales].sort());

    for (const locale of locales as readonly Locale[]) {
      const copy = commercialSurfaceCopy[locale];
      expect(copy.pricing.heroTitle.length).toBeGreaterThan(20);
      expect(copy.checkout.heroTitle.length).toBeGreaterThan(12);
      expect(copy.login.title.length).toBeGreaterThan(8);
      expect(copy.signup.title.length).toBeGreaterThan(8);
      expect(copy.consent.body.length).toBeGreaterThan(30);
      expect(copy.pricing.plan.starter.cta).toBeTruthy();
      expect(copy.pricing.plan.professional.cta).toBeTruthy();
      expect(copy.pricing.plan.business.cta).toBeTruthy();
      expect(copy.pricing.plan.enterprise.cta).toBeTruthy();
    }
  });

  it('does not silently reuse the English critical journey for non-English locales', () => {
    const english = commercialSurfaceCopy.en;
    for (const locale of ['pt', 'es', 'fr', 'it', 'de'] as const) {
      const copy = commercialSurfaceCopy[locale];
      expect(copy.pricing.heroTitle).not.toBe(english.pricing.heroTitle);
      expect(copy.checkout.heroTitle).not.toBe(english.checkout.heroTitle);
      expect(copy.login.title).not.toBe(english.login.title);
      expect(copy.signup.title).not.toBe(english.signup.title);
      expect(copy.consent.title).not.toBe(english.consent.title);
    }
  });

  it('keeps commercial truth in the billing catalog while localizing presentation only', () => {
    expect(pricingPage).toContain('BILLING_PLANS.map((plan) =>');
    expect(checkoutPage).toContain('BILLING_PLANS.map((plan) =>');
    expect(signupPage).toContain('BILLING_PLANS.map((plan) =>');
    expect(pricingPage).toContain('plan.features.slice(0, 6).map');
    expect(checkoutPage).toContain('selectedPlan.features.slice(0, 6).map');
    expect(pricingPage).toContain('getCommercialSurfaceCopy(locale).pricing');
    expect(checkoutPage).toContain('getCommercialSurfaceCopy(locale).checkout');
    expect(loginPage).toContain('getCommercialSurfaceCopy(locale).login');
    expect(signupPage).toContain('getCommercialSurfaceCopy(activeLocale).signup');
  });

  it('keeps the compact purchase headers usable on small screens', () => {
    expect(pricingPage).toContain('gap-3 px-4 py-4 sm:px-6 sm:py-5');
    expect(pricingPage).toContain('hidden rounded-full border border-white/15 px-3 py-2');
    expect(checkoutPage).toContain('gap-3 px-4 py-4 sm:px-6 sm:py-5');
    expect(checkoutPage).toContain('text-xs sm:gap-2 sm:text-sm');
  });

  it('keeps analytics consent fail-closed and localizes the consent decision', () => {
    expect(posthogClient).toContain("window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted'");
    expect(posthogClient).toContain('!hasAnalyticsConsent()');
    expect(posthogClient).toContain('opt_out_capturing_by_default: requiresConsent()');
    expect(consentBanner).toContain('getCommercialSurfaceCopy(localeFromPath(pathname)).consent');
    expect(consentBanner).toContain('{copy.decline}');
    expect(consentBanner).toContain('{copy.allow}');
  });

  it('renders the already-authored localized Trust Center overview instead of discarding it', () => {
    expect(trustPage).toContain("localizedCopy={locale === 'en' ? undefined : copy}");
    expect(trustComponent).toContain("localizedCopy && kind === 'trust' ? localizedLandingContent(localizedCopy)");
    expect(trustComponent).toContain('lang="en"');
    expect(trustComponent).toContain('copy.procurementItems');
    expect(trustComponent).toContain('copy.evidenceItems');
  });

  it('localizes onboarding chrome, steps, field labels and selection values for every configured locale', () => {
    expect(onboardingFlow).toContain('const copyByLocale: Record<string, LocaleCopy> = { en, pt, es, fr, it, de };');
    expect(onboardingFlow).toContain("const t = (ptText: string, enText: string) => translate(locale, enText, ptText)");
    expect(onboardingFlow).toContain("title: 'Construye la base operativa para la gobernanza de IA'");
    expect(onboardingFlow).toContain("title: 'Construisez la base opérationnelle de votre gouvernance IA'");
    expect(onboardingFlow).toContain("title: 'Costruisci la base operativa per la governance IA'");
    expect(onboardingFlow).toContain("title: 'Schaffen Sie die operative Grundlage für KI-Governance'");
    expect(onboardingFlow).toContain('{translate(locale, labels[item])}');
    expect(onboardingFlow).toContain('{translate(locale, titleEn, titlePt)}');
    expect(onboardingFlow).not.toContain("const isPt = locale === 'pt'");
    expect(onboardingFlow).not.toContain('isPt ? titlePt : titleEn');
  });

  it('localizes the first AI-system workflow across all configured non-English locales', () => {
    expect(aiSystemsPage).toContain("es: {");
    expect(aiSystemsPage).toContain("title: 'Inventario de sistemas de IA'");
    expect(aiSystemsPage).toContain("title: 'Inventaire des systèmes IA'");
    expect(aiSystemsPage).toContain("title: 'Inventario dei sistemi IA'");
    expect(aiSystemsPage).toContain("title: 'KI-Systeminventar'");
    expect(aiSystemsPage).toContain("submit: 'Clasificar y guardar'");
    expect(aiSystemsPage).toContain("submit: 'Classifier et enregistrer'");
    expect(aiSystemsPage).toContain("submit: 'Classifica e salva'");
    expect(aiSystemsPage).toContain("submit: 'Klassifizieren und speichern'");
    expect(aiSystemsPage).toContain('getRiskLabel(locale, system.risk_level)');
    expect(aiSystemsPage).toContain('options.domains[value]');
    expect(aiSystemsPage).not.toContain("es: { ...baseInventoryCopy }");
    expect(aiSystemsPage).not.toContain("fr: { ...baseInventoryCopy }");
    expect(aiSystemsPage).not.toContain("it: { ...baseInventoryCopy }");
    expect(aiSystemsPage).not.toContain("de: { ...baseInventoryCopy }");
  });

  it('preserves keyboard focus treatment on purchase, auth, onboarding, AI inventory and trust controls', () => {
    expect(pricingPage).toContain('focus-visible:ring-2');
    expect(checkoutPage).toContain('focus-visible:ring-2');
    expect(loginPage).toContain('focus-visible:ring-2');
    expect(signupPage).toContain('focus-visible:ring-2');
    expect(onboardingFlow).toContain('focus-visible:ring-2');
    expect(aiSystemsPage).toContain('focus-visible:ring-2');
    expect(trustComponent).toContain('focus-visible:ring-2');
  });
});
