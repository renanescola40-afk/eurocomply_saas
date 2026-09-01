import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const CONTACT = new URL('../../src/app/[locale]/contact/page.tsx', import.meta.url);
const CONSENT_BANNER = new URL('../../src/components/analytics/AnalyticsConsentBanner.tsx', import.meta.url);
const CONSENT_CONTROLS = new URL('../../src/components/analytics/AnalyticsConsentControls.tsx', import.meta.url);
const LEGAL_REVIEW = new URL('../../src/components/legal/public-legal-review-page.tsx', import.meta.url);
const PROVIDER_DATA = new URL('../../src/app/[locale]/dashboard/provider-data/page.tsx', import.meta.url);
const ANNEX_IV = new URL('../../src/app/[locale]/dashboard/annex-iv/page.tsx', import.meta.url);
const EXECUTIVE_SUMMARY = new URL('../../src/components/ExecutiveComplianceSummary.tsx', import.meta.url);
const ARTICLE_50 = new URL('../../src/components/ai-governance/article-50-workspace.tsx', import.meta.url);
const INTERNATIONAL_HOME = new URL('../../src/components/marketing/international-home.tsx', import.meta.url);
const FEATURE_PAGE = new URL('../../src/app/[locale]/features/[feature]/page.tsx', import.meta.url);
const PLATFORM_LAYOUT = new URL('../../src/app/[locale]/platform/layout.tsx', import.meta.url);
const VERIFIED_STATUS = new URL('../../src/components/marketing/verified-status-page.tsx', import.meta.url);
const PROCUREMENT_PACK = new URL('../../src/app/[locale]/trust/procurement-pack/page.tsx', import.meta.url);
const WAITLIST_INTERACTIONS = new URL('../../src/components/marketing/waitlist-interactions.tsx', import.meta.url);
const PUBLIC_FOOTER = new URL('../../src/components/marketing/public-footer.tsx', import.meta.url);
const TRUST_CENTER = new URL('../../src/components/marketing/trust-center-page.tsx', import.meta.url);
const DYNAMIC_TRUST = new URL('../../src/components/trust/trust-page.tsx', import.meta.url);
const BOOK_DEMO_PAGE = new URL('../../src/app/[locale]/book-demo/page.tsx', import.meta.url);
const BOOK_DEMO_FORM = new URL('../../src/components/marketing/book-demo-form.tsx', import.meta.url);

describe('RISCK COMPLY UI V2 final public consistency', () => {
  it('uses the official wordmark and cobalt system on the contact surface', async () => {
    const source = await readFile(CONTACT, 'utf8');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('focus-visible:ring-blue-400');
    expect(source).not.toContain('ShieldCheck');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('rounded-[2rem]');
  });

  it('keeps analytics consent logic intact while removing legacy cyan chrome', async () => {
    const [banner, controls] = await Promise.all([readFile(CONSENT_BANNER, 'utf8'), readFile(CONSENT_CONTROLS, 'utf8')]);
    expect(banner).toContain('denyAnalyticsConsent');
    expect(banner).toContain('grantAnalyticsConsent');
    expect(banner).toContain('initPostHog');
    expect(banner).toContain('focus-visible:ring-blue-400');
    expect(banner).not.toContain('cyan-');
    expect(controls).toContain('denyAnalyticsConsent');
    expect(controls).toContain('grantAnalyticsConsent');
    expect(controls).toContain('initPostHog');
    expect(controls).toContain('bg-blue-600');
    expect(controls).not.toContain('cyan-');
  });

  it('uses the official wordmark and graphite/cobalt system on public legal review pages', async () => {
    const source = await readFile(LEGAL_REVIEW, 'utf8');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('text-blue-300/75');
    expect(source).toContain("documentId === 'cookie-policy' ? <AnalyticsConsentControls");
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('rounded-3xl');
  });

  it('keeps provider-data runtime authority while removing the nested legacy canvas', async () => {
    const source = await readFile(PROVIDER_DATA, 'utf8');
    expect(source).toContain("fetch('/api/ai-governance/provider-data'");
    expect(source).toContain("cache: 'no-store'");
    expect(source).toContain('workflow=${workflow}');
    expect(source).toContain("method: 'POST'");
    expect(source).toContain('aria-labelledby="provider-data-title"');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('min-h-screen');
  });

  it('keeps Annex IV workflow authority while inheriting the enterprise dashboard shell', async () => {
    const source = await readFile(ANNEX_IV, 'utf8');
    expect(source).toContain("fetch('/api/ai-governance/annex-iv'");
    expect(source).toContain("cache: 'no-store'");
    expect(source).toContain('workflow=${workflow}');
    expect(source).toContain("method: 'POST'");
    expect(source).toContain('aria-labelledby="annex-iv-title"');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain('bg-amber-300/[0.06]');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('min-h-screen');
  });

  it('keeps executive calculations while replacing decorative gradients with semantic compact cards', async () => {
    const source = await readFile(EXECUTIVE_SUMMARY, 'utf8');
    expect(source).toContain('tryLoadLatestGapAssessment');
    expect(source).toContain('tryLoadOpenComplianceWork');
    expect(source).toContain('score - criticalFindings * 8 - openTasks * 2');
    expect(source).toContain('bg-blue-500/[0.06]');
    expect(source).toContain('bg-red-500/[0.06]');
    expect(source).toContain('bg-amber-500/[0.06]');
    expect(source).toContain('bg-emerald-500/[0.06]');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('bg-gradient-to-br');
    expect(source).not.toContain('rounded-2xl');
  });

  it('keeps Article 50 runtime authority and legal deadline logic while using the enterprise shell', async () => {
    const source = await readFile(ARTICLE_50, 'utf8');
    expect(source).toContain("fetch('/api/ai-governance/article-50'");
    expect(source).toContain("cache: 'no-store'");
    expect(source).toContain('workflow=assessment_create');
    expect(source).toContain('workflow=evidence_submit');
    expect(source).toContain('getArticle50DeadlineView');
    expect(source).toContain('digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems');
    expect(source).toContain('aria-labelledby="article-50-title"');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain("status === 'READY'");
    expect(source).toContain("status === 'NEEDS_REVIEW'");
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('rounded-3xl');
    expect(source).not.toContain('bg-white/[0.025]');
  });

  it('keeps international landing copy and feature discovery while enforcing the V2 brand contract', async () => {
    const source = await readFile(INTERNATIONAL_HOME, 'utf8');
    expect(source).toContain('getFeaturePages(locale)');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('text-emerald-300');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('rounded-[2rem]');
    expect(source).not.toContain('ShieldCheck');
  });

  it('keeps localized SEO and feature content while removing legacy cyan/green marketing chrome', async () => {
    const source = await readFile(FEATURE_PAGE, 'utf8');
    expect(source).toContain('getFeaturePageBySlug(locale, feature)');
    expect(source).toContain('getFeatureLanguageAlternates(page.key)');
    expect(source).toContain("'@type': 'FAQPage'");
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-blue-600');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('rounded-[2rem]');
    expect(source).not.toContain('rounded-[2.2rem]');
    expect(source).not.toContain('bg-[linear-gradient');
  });

  it('uses the official wordmark and cobalt navigation on the platform surface', async () => {
    const source = await readFile(PLATFORM_LAYOUT, 'utf8');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('focus-visible:ring-blue-400');
    expect(source).toContain('/platform/organizations/new');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('rounded-full');
  });

  it('preserves verified status authority while using semantic green only for healthy state', async () => {
    const source = await readFile(VERIFIED_STATUS, 'utf8');
    expect(source).toContain('VERIFIED_STATUS_PAGE_URL');
    expect(source).toContain('target="_blank"');
    expect(source).toContain('text-emerald-100');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('rounded-[1.75rem]');
  });

  it('preserves procurement data and API authority while mapping configured state to cobalt', async () => {
    const source = await readFile(PROCUREMENT_PACK, 'utf8');
    expect(source).toContain('procurementControls.map');
    expect(source).toContain('procurementProviders.map');
    expect(source).toContain('procurementDocuments.map');
    expect(source).toContain('href="/api/trust/procurement-pack"');
    expect(source).toContain("status === 'implemented'");
    expect(source).toContain("status === 'configured'");
    expect(source).toContain("status === 'evidence-required'");
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-blue-600');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('radial-gradient');
  });

  it('preserves waitlist submission behavior and uses semantic feedback colors only for state', async () => {
    const source = await readFile(WAITLIST_INTERACTIONS, 'utf8');
    expect(source).toContain("fetch('/api/prelaunch'");
    expect(source).toContain('resolveWaitlistSubmitFeedback');
    expect(source).toContain('consentToContact: true');
    expect(source).toContain("status === 'success'");
    expect(source).toContain("status === 'warning'");
    expect(source).toContain("status === 'error'");
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('bg-violet-500/10');
    expect(source).toContain('bg-emerald-300/10');
    expect(source).toContain('bg-amber-400/10');
    expect(source).toContain('bg-red-500/10');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('rounded-[2rem]');
  });

  it('keeps footer routes and localization while enforcing the graphite/cobalt brand contract', async () => {
    const source = await readFile(PUBLIC_FOOTER, 'utf8');
    expect(source).toContain('getFeaturePages(activeLocale)');
    expect(source).toContain('getLocalizedTrustCenterPages(activeLocale)');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('focus-visible:ring-blue-400');
    expect(source).toContain('bg-blue-500/[0.06]');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('bg-[#050505]');
  });

  it('keeps Trust Center claims and legal publication authority while removing legacy marketing chrome', async () => {
    const source = await readFile(TRUST_CENTER, 'utf8');
    expect(source).toContain('getLegalPublicationState()');
    expect(source).toContain('PAGE_CONTENT[kind] ?? PAGE_CONTENT.trust');
    expect(source).toContain('content.providers.map');
    expect(source).toContain('content.statusRows.map');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain('bg-amber-200/[0.06]');
    expect(source).toContain('focus-visible:ring-blue-400');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('rounded-[2rem]');
    expect(source).not.toContain('rounded-[1.8rem]');
  });

  it('keeps dynamic Trust localization and legal publication truth while using neutral/cobalt assurance chrome', async () => {
    const source = await readFile(DYNAMIC_TRUST, 'utf8');
    expect(source).toContain('getLocalizedTrustCenterPages(locale)');
    expect(source).toContain('getLegalPublicationState()');
    expect(source).toContain('ProviderRuntimeDisclosure');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain('bg-blue-500/[0.06]');
    expect(source).toContain('bg-amber-300/[0.055]');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('tech-grid');
    expect(source).not.toContain('bg-emerald-300/[0.055]');
  });

  it('keeps demo demand capture and analytics while aligning the page and form to graphite/cobalt', async () => {
    const [page, form] = await Promise.all([readFile(BOOK_DEMO_PAGE, 'utf8'), readFile(BOOK_DEMO_FORM, 'utf8')]);
    expect(page).toContain('<BookDemoForm locale={locale} />');
    expect(page).toContain('/brand/risck-comply-wordmark.svg');
    expect(page).toContain('bg-[#050913]');
    expect(page).toContain('bg-[#0d1522]');
    expect(page).not.toContain('radial-gradient');
    expect(page).not.toContain('tech-grid');
    expect(page).not.toContain('rounded-[1.5rem]');
    expect(form).toContain("fetch('/api/leads'");
    expect(form).toContain('analyticsEvents.demoStarted');
    expect(form).toContain('analyticsEvents.demoSubmitted');
    expect(form).toContain("consentToContact: formData.get('consentToContact') === 'on'");
    expect(form).toContain('bg-blue-600');
    expect(form).toContain('bg-emerald-400/10');
    expect(form).toContain('bg-red-400/10');
    expect(form).not.toContain('rounded-[2rem]');
    expect(form).not.toContain('rounded-full');
  });
});
