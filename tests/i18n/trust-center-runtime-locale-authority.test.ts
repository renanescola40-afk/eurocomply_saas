import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getLocalizedTrustCenterPage, getTrustCenterUi } from '@/lib/trust-center/localized-content';
import { TRUST_CENTER_ROUTES } from '@/lib/trust-center/routes';
import { applyVerifiedTrustAuthority } from '@/lib/trust-center/verified-authority';

const runtimeRoute = readFileSync(join(process.cwd(), 'src/app/[locale]/[trustPage]/page.tsx'), 'utf8');
const runtimeComponent = readFileSync(join(process.cwd(), 'src/components/trust/trust-page.tsx'), 'utf8');

const nonEnglishLocales = ['pt', 'es', 'fr', 'it', 'de'] as const;
const SECURITY_EMAIL = 'comercial@risckcomply.com';
const UNVERIFIED_SECURITY_EMAIL = 'security@risckcomply.com';

describe('runtime Trust Center locale authority', () => {
  it('routes metadata and rendering through the same localized authority used in production', () => {
    expect(runtimeRoute).toContain("import { getLocalizedTrustCenterPage } from '@/lib/trust-center/localized-content'");
    expect(runtimeRoute.match(/getLocalizedTrustCenterPage\(trustPage, locale\)/g)).toHaveLength(2);
    expect(runtimeRoute).not.toContain("getTrustCenterPage(trustPage, locale)");
  });

  it('localizes runtime chrome instead of hardcoding English navigation and proof labels', () => {
    expect(runtimeComponent).toContain('getLocalizedTrustCenterPages(locale)');
    expect(runtimeComponent).toContain('getTrustCenterUi(locale)');
    expect(runtimeComponent).toContain('ui.proofBadges.map');
    expect(runtimeComponent).toContain('{ui.lastUpdated}: {page.updated}');
    expect(runtimeComponent).toContain('{ui.portal}');
    expect(runtimeComponent).not.toContain("['Security review', 'Procurement diligence', 'Evidence preparation']");
    expect(runtimeComponent).not.toContain('>Last updated:');
    expect(runtimeComponent).not.toContain('>Trust portal<');
  });

  it('provides complete translated content for every configured non-English locale and trust route', () => {
    expect(locales).toEqual(['en', 'pt', 'es', 'fr', 'it', 'de']);

    for (const locale of nonEnglishLocales) {
      const englishUi = getTrustCenterUi('en');
      const ui = getTrustCenterUi(locale);
      expect(ui.proofBadges.join('|')).not.toBe(englishUi.proofBadges.join('|'));
      expect(ui.lastUpdated).not.toBe(englishUi.lastUpdated);
      expect(ui.portal).not.toBe(englishUi.portal);

      for (const slug of TRUST_CENTER_ROUTES) {
        const english = getLocalizedTrustCenterPage(slug, 'en');
        const localized = getLocalizedTrustCenterPage(slug, locale);

        expect(localized.slug).toBe(slug);
        expect(localized.updated).toBe(english.updated);
        expect(localized.navLabel.trim().length).toBeGreaterThan(1);
        expect(localized.title.trim().length).toBeGreaterThan(1);
        expect(localized.subtitle.trim().length).toBeGreaterThan(20);
        expect(localized.status.trim().length).toBeGreaterThan(20);
        expect(localized.sections.length).toBe(english.sections.length);
        expect(localized.sections[0]?.body.trim().length).toBeGreaterThan(30);
        expect(localized.subtitle).not.toBe(english.subtitle);
        expect(localized.status).not.toBe(english.status);
        expect(localized.sections[0]?.body).not.toBe(english.sections[0]?.body);
      }
    }
  });

  it('keeps Portuguese procurement surfaces accented and publishes only the verified runtime security authority', () => {
    const trust = getLocalizedTrustCenterPage('trust', 'pt');
    const security = getLocalizedTrustCenterPage('security', 'pt');
    const disclosure = applyVerifiedTrustAuthority(
      getLocalizedTrustCenterPage('vulnerability-disclosure', 'pt'),
      'pt',
    );

    expect(trust.title).toBe('Centro de Confiança');
    expect(trust.subtitle).toContain('Informação');
    expect(security.title).toBe('Segurança');
    expect(disclosure.sections[0]?.body).toContain(SECURITY_EMAIL);
    expect(disclosure.sections[0]?.body).not.toContain(UNVERIFIED_SECURITY_EMAIL);
    expect(disclosure.sections[0]?.body).not.toMatch(/@gmail\.com/i);
  });

  it('keeps the verified disclosure authority consistent across every runtime locale', () => {
    for (const locale of locales as readonly Locale[]) {
      const disclosure = applyVerifiedTrustAuthority(
        getLocalizedTrustCenterPage('vulnerability-disclosure', locale),
        locale,
      );
      expect(disclosure.sections[0]?.body).toContain(SECURITY_EMAIL);
      expect(disclosure.sections[0]?.body).not.toContain(UNVERIFIED_SECURITY_EMAIL);
      expect(disclosure.sections[0]?.body).not.toMatch(/@gmail\.com/i);
    }
  });

  it('preserves keyboard focus treatment on the runtime procurement navigation', () => {
    expect(runtimeComponent).toContain('focus-visible:ring-2');
    expect(runtimeComponent).toContain('focus-visible:ring-cyan-200');
    expect(runtimeComponent).toContain('aria-label={ui.portal}');
  });
});
