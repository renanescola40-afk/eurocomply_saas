import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getBillingFeatureLabel } from '@/lib/i18n/billing-feature-labels';
import { commercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';

const pricingPage = readFileSync(join(process.cwd(), 'src/app/[locale]/pricing/page.tsx'), 'utf8');
const checkoutPage = readFileSync(join(process.cwd(), 'src/app/[locale]/checkout/page.tsx'), 'utf8');
const loginPage = readFileSync(join(process.cwd(), 'src/app/[locale]/login/page.tsx'), 'utf8');
const signupPage = readFileSync(join(process.cwd(), 'src/app/[locale]/signup/page.tsx'), 'utf8');
const aiSystemsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/ai-systems/ai-systems-client.tsx'), 'utf8');
const onboardingFlow = readFileSync(join(process.cwd(), 'src/components/onboarding/b2b-onboarding-flow.tsx'), 'utf8');
const runtimeTrustRoute = readFileSync(join(process.cwd(), 'src/app/[locale]/[trustPage]/page.tsx'), 'utf8');
const runtimeTrustComponent = readFileSync(join(process.cwd(), 'src/components/trust/trust-page.tsx'), 'utf8');
const consentBanner = readFileSync(join(process.cwd(), 'src/components/analytics/AnalyticsConsentBanner.tsx'), 'utf8');
const posthogClient = readFileSync(join(process.cwd(), 'src/lib/analytics/posthog-client.ts'), 'utf8');
const upgradeCard = readFileSync(join(process.cwd(), 'src/components/billing/upgrade-required-card.tsx'), 'utf8');
const raciPage = readFileSync(join(process.cwd(), 'src/app/[locale]/raci/page.tsx'), 'utf8');
const approvalsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/aprovacoes/page.tsx'), 'utf8');
const executiveReportsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/reports-governance/page.tsx'), 'utf8');
const regulatoryJournalPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/reports-governance/news/page.tsx'), 'utf8');

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
    expect(pricingPage).toContain('getBillingFeatureLabel(locale, feature)');
    expect(checkoutPage).toContain('getBillingFeatureLabel(locale, feature)');
    expect(pricingPage).toContain('getCommercialSurfaceCopy(locale).pricing');
    expect(checkoutPage).toContain('getCommercialSurfaceCopy(locale).checkout');
    expect(loginPage).toContain('getCommercialSurfaceCopy(locale).login');
    expect(signupPage).toContain('getCommercialSurfaceCopy(activeLocale).signup');

    expect(getBillingFeatureLabel('pt', 'AI Inventory')).toBe('Inventário de IA');
    expect(getBillingFeatureLabel('es', 'Risk Register')).toBe('Registro de riesgos');
    expect(getBillingFeatureLabel('fr', 'Approval Workflows')).toBe('Flux d’approbation');
    expect(getBillingFeatureLabel('it', 'Regulatory Monitoring')).toBe('Monitoraggio normativo');
    expect(getBillingFeatureLabel('de', 'Advanced Reporting')).toBe('Erweiterte Berichte');
    expect(getBillingFeatureLabel('en', 'AI Inventory')).toBe('AI Inventory');
  });

  it('keeps the compact purchase headers usable on small screens', () => {
    expect(pricingPage).toContain('gap-3 px-4 py-4 sm:px-6 sm:py-5');
    expect(pricingPage).toContain('hidden rounded-full border border-white/15 px-3 py-2');
    expect(checkoutPage).toContain('gap-3 px-4 py-4 sm:px-6 sm:py-5');
    expect(checkoutPage).toContain('text-xs sm:gap-2 sm:text-sm');
  });

  it('keeps analytics consent fail-closed and localizes the consent decision', () => {
    expect(posthogClient).toContain(
      "return process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT !== 'false';",
    );
    expect(posthogClient).toContain("window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted'");
    expect(posthogClient).toContain('!hasAnalyticsConsent()');
    expect(posthogClient).toContain('opt_out_capturing_by_default: isAnalyticsConsentRequired()');
    expect(consentBanner).toContain('isAnalyticsConsentRequired()');
    expect(consentBanner).toContain('getCommercialSurfaceCopy(localeFromPath(pathname)).consent');
    expect(consentBanner).toContain('{copy.decline}');
    expect(consentBanner).toContain('{copy.allow}');
  });

  it('validates the consolidated runtime Trust Center rather than the shadowed legacy route', () => {
    expect(runtimeTrustRoute).toContain("getLocalizedTrustCenterPage(trustPage, locale)");
    expect(runtimeTrustComponent).toContain('getLocalizedTrustCenterPages(locale)');
    expect(runtimeTrustComponent).toContain('getTrustCenterUi(locale)');
    expect(runtimeTrustComponent).toContain('ui.proofBadges.map');
    expect(runtimeTrustComponent).toContain('{ui.lastUpdated}: {page.updated}');
    expect(runtimeTrustComponent).not.toContain("['Security review', 'Procurement diligence', 'Evidence preparation']");
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

  it('keeps locked-feature upgrade UX in the selected locale without changing entitlement decisions', () => {
    expect(upgradeCard).toContain('Record<Locale');
    expect(upgradeCard).toContain("es: { required: (plan) => `Se requiere el plan ${plan}`");
    expect(upgradeCard).toContain("fr: { required: (plan) => `Plan ${plan} requis`");
    expect(upgradeCard).toContain("it: { required: (plan) => `Piano ${plan} richiesto`");
    expect(upgradeCard).toContain("de: { required: (plan) => `${plan}-Plan erforderlich`");
    expect(upgradeCard).toContain('ctaLabel ?? localized.upgrades');
    expect(upgradeCard).toContain('{localized.plans}');
    expect(upgradeCard).toContain('/dashboard/organizations/add-ons');
    expect(upgradeCard).not.toContain("ctaLabel = 'Ver planos'");

    for (const page of [raciPage, approvalsPage, executiveReportsPage]) {
      expect(page).toContain('const upgradeCopy: Record<Locale');
      expect(page).toContain('title={lockedCopy.title}');
      expect(page).toContain('description={lockedCopy.description}');
      expect(page).toContain('getOrganizationEntitlements');
    }
  });

  it('localizes regulatory journal chrome without rewriting stored editorial intelligence', () => {
    expect(regulatoryJournalPage).toContain('const journalCopy: Record<Locale, JournalCopy>');
    expect(regulatoryJournalPage).toContain("es: {");
    expect(regulatoryJournalPage).toContain("fr: {");
    expect(regulatoryJournalPage).toContain("it: {");
    expect(regulatoryJournalPage).toContain("de: {");
    expect(regulatoryJournalPage).toContain('{copy.preview}');
    expect(regulatoryJournalPage).toContain('{copy.noVerifiedItems}');
    expect(regulatoryJournalPage).toContain('{item.title}');
    expect(regulatoryJournalPage).toContain('{item.newspaperDeck}');
    expect(regulatoryJournalPage).toContain('{item.articleParagraphs[0]}');
    expect(regulatoryJournalPage).toContain('{item.calendarSuggestion}');
    expect(regulatoryJournalPage).toContain('{item.recommendedActions.map');
    expect(regulatoryJournalPage).toContain('href={item.sourceUrl}');
  });

  it('preserves keyboard focus treatment on purchase, auth, onboarding, AI inventory, trust and upgrade controls', () => {
    expect(pricingPage).toContain('focus-visible:ring-2');
    expect(checkoutPage).toContain('focus-visible:ring-2');
    expect(loginPage).toContain('focus-visible:ring-2');
    expect(signupPage).toContain('focus-visible:ring-2');
    expect(onboardingFlow).toContain('focus-visible:ring-2');
    expect(aiSystemsPage).toContain('focus-visible:ring-2');
    expect(runtimeTrustComponent).toContain('focus-visible:ring-2');
    expect(upgradeCard).toContain('focus-visible:ring-2');
    expect(regulatoryJournalPage).toContain('focus-visible:ring-2');
  });
});
