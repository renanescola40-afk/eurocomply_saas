import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const MIDDLEWARE = new URL('../src/middleware.ts', import.meta.url);
const COMMERCIAL_POLICY = new URL('../src/lib/security/commercial-route-policy.ts', import.meta.url);
const LEGAL_PAGE = new URL('../src/components/legal/public-legal-review-page.tsx', import.meta.url);
const PRIVACY_PAGE = new URL('../src/app/[locale]/privacy/page.tsx', import.meta.url);
const COOKIE_PAGE = new URL('../src/app/[locale]/cookie-policy/page.tsx', import.meta.url);
const ACCEPTABLE_USE_PAGE = new URL('../src/app/[locale]/acceptable-use/page.tsx', import.meta.url);
const TRANSFERS_PAGE = new URL('../src/app/[locale]/transfers/page.tsx', import.meta.url);
const CONSENT_BANNER = new URL('../src/components/analytics/AnalyticsConsentBanner.tsx', import.meta.url);

const PUBLIC_LEGAL_ROUTES = ['/privacy', '/cookie-policy', '/acceptable-use', '/transfers'] as const;

describe('public legal review surfaces', () => {
  it('keeps the review routes public in both routing authorities', async () => {
    const [middleware, commercialPolicy] = await Promise.all([
      readFile(MIDDLEWARE, 'utf8'),
      readFile(COMMERCIAL_POLICY, 'utf8'),
    ]);

    for (const route of PUBLIC_LEGAL_ROUTES) {
      expect(middleware, route).toContain(`'${route}'`);
      expect(commercialPolicy, route).toContain(`'${route}'`);
    }
  });

  it('fails legal publication claims closed while founder/counsel approval is pending', async () => {
    const source = await readFile(LEGAL_PAGE, 'utf8');

    expect(source).toContain('REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED');
    expect(source).toContain('Pending qualified legal approval');
    expect(source).toContain('document_id:');
  });

  it('version-tags each legal review document without company placeholders', async () => {
    const [privacy, cookie, acceptableUse, transfers] = await Promise.all([
      readFile(PRIVACY_PAGE, 'utf8'),
      readFile(COOKIE_PAGE, 'utf8'),
      readFile(ACCEPTABLE_USE_PAGE, 'utf8'),
      readFile(TRANSFERS_PAGE, 'utf8'),
    ]);

    expect(privacy).toContain('version="0.2-review"');
    for (const source of [privacy, cookie, acceptableUse, transfers]) {
      expect(source).toContain('lastUpdated={LAST_UPDATED}');
      expect(source).not.toMatch(/\[COMPANY|\[ADDRESS|\bTODO\b|\bTBD\b|example\.com/i);
    }

    for (const source of [cookie, acceptableUse, transfers]) {
      expect(source).toContain('version="0.1-review"');
    }
  });

  it('publishes a fail-closed privacy structure without inventing unresolved controller facts', async () => {
    const source = await readFile(PRIVACY_PAGE, 'utf8');

    expect(source).toContain('documentId="privacy-policy"');
    expect(source).toContain('Controller identity and privacy contact');
    expect(source).toContain('comercial@risckcomply.com');
    expect(source).toContain('Scope and role boundary');
    expect(source).toContain('Personal-data categories');
    expect(source).toContain('Purposes');
    expect(source).toContain('Legal bases — review boundary');
    expect(source).toContain('Recipients and service providers');
    expect(source).toContain('International transfers');
    expect(source).toContain('Retention and deletion');
    expect(source).toContain('Your rights and request routing');
    expect(source).toContain('Consent and optional analytics');
    expect(source).toContain('Data you are required to provide');
    expect(source).toContain('Sources of personal data');
    expect(source).toContain('Automated decision-making');
    expect(source).toContain('Complaints, children and changes');
    expect(source).toContain('eu-west-1 (Ireland)');
    expect(source).toContain('AnalyticsConsentControls');

    expect(source).toContain('legal entity and its registered identifiers are still pending authoritative founder/entity confirmation');
    expect(source).not.toContain('SAMUEL CERQUEIRA, UNIPESSOAL LDA');
    expect(source).not.toMatch(/\bNIF\b|\bNIPC\b/);
  });

  it('links the consent surface to cookie policy and exposes consent withdrawal controls', async () => {
    const [banner, legalPage, privacyPage] = await Promise.all([
      readFile(CONSENT_BANNER, 'utf8'),
      readFile(LEGAL_PAGE, 'utf8'),
      readFile(PRIVACY_PAGE, 'utf8'),
    ]);

    expect(banner).toContain('`/${locale}/cookie-policy`');
    expect(legalPage).toContain("documentId === 'cookie-policy'");
    expect(legalPage).toContain('AnalyticsConsentControls');
    expect(privacyPage).toContain('actions={<AnalyticsConsentControls locale={locale} />}');
  });
});
