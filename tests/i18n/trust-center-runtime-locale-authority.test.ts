import { describe, expect, it } from 'vitest';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getLocalizedTrustCenterPage, getTrustCenterUi } from '@/lib/trust-center/localized-content';
import { TRUST_CENTER_ROUTES } from '@/lib/trust-center/routes';
import { applyVerifiedTrustAuthority } from '@/lib/trust-center/verified-authority';

const SECURITY_EMAIL = 'comercial@risckcomply.com';
const UNVERIFIED_SECURITY_EMAIL = 'security@risckcomply.com';

describe('English-only runtime Trust Center authority', () => {
  it('returns the canonical English chrome for every historical locale', () => {
    const englishUi = getTrustCenterUi('en');
    for (const locale of locales as readonly Locale[]) {
      expect(getTrustCenterUi(locale)).toEqual(englishUi);
    }
  });

  it('returns the canonical English Trust Center content for every historical locale', () => {
    for (const slug of TRUST_CENTER_ROUTES) {
      const english = getLocalizedTrustCenterPage(slug, 'en');
      for (const locale of locales as readonly Locale[]) {
        expect(getLocalizedTrustCenterPage(slug, locale)).toEqual(english);
      }
    }
  });

  it('keeps verified disclosure authority consistent for every historical locale', () => {
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
});
