import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const CONTACT = new URL('../../src/app/[locale]/contact/page.tsx', import.meta.url);
const CONSENT_BANNER = new URL('../../src/components/analytics/AnalyticsConsentBanner.tsx', import.meta.url);
const CONSENT_CONTROLS = new URL('../../src/components/analytics/AnalyticsConsentControls.tsx', import.meta.url);
const LEGAL_REVIEW = new URL('../../src/components/legal/public-legal-review-page.tsx', import.meta.url);
const PROVIDER_DATA = new URL('../../src/app/[locale]/dashboard/provider-data/page.tsx', import.meta.url);
const INTERNATIONAL_HOME = new URL('../../src/components/marketing/international-home.tsx', import.meta.url);
const FEATURE_PAGE = new URL('../../src/app/[locale]/features/[feature]/page.tsx', import.meta.url);

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
    const [banner, controls] = await Promise.all([
      readFile(CONSENT_BANNER, 'utf8'),
      readFile(CONSENT_CONTROLS, 'utf8'),
    ]);

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
});
