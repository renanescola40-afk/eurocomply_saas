import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const MIDDLEWARE = new URL('../src/middleware.ts', import.meta.url);
const COMMERCIAL_POLICY = new URL('../src/lib/security/commercial-route-policy.ts', import.meta.url);
const LEGAL_PAGE = new URL('../src/components/legal/public-legal-review-page.tsx', import.meta.url);
const COOKIE_PAGE = new URL('../src/app/[locale]/cookie-policy/page.tsx', import.meta.url);
const ACCEPTABLE_USE_PAGE = new URL('../src/app/[locale]/acceptable-use/page.tsx', import.meta.url);
const TRANSFERS_PAGE = new URL('../src/app/[locale]/transfers/page.tsx', import.meta.url);
const CONSENT_BANNER = new URL('../src/components/analytics/AnalyticsConsentBanner.tsx', import.meta.url);

const PUBLIC_LEGAL_ROUTES = ['/cookie-policy', '/acceptable-use', '/transfers'] as const;

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

  it('version-tags each new legal review document without company placeholders', async () => {
    const sources = await Promise.all([
      readFile(COOKIE_PAGE, 'utf8'),
      readFile(ACCEPTABLE_USE_PAGE, 'utf8'),
      readFile(TRANSFERS_PAGE, 'utf8'),
    ]);

    for (const source of sources) {
      expect(source).toContain('version="0.1-review"');
      expect(source).toContain('lastUpdated={LAST_UPDATED}');
      expect(source).not.toMatch(/\[COMPANY|\[ADDRESS|\bTODO\b|\bTBD\b|example\.com/i);
    }
  });

  it('links the consent surface to cookie policy and exposes consent withdrawal controls', async () => {
    const [banner, legalPage] = await Promise.all([
      readFile(CONSENT_BANNER, 'utf8'),
      readFile(LEGAL_PAGE, 'utf8'),
    ]);

    expect(banner).toContain('`/${locale}/cookie-policy`');
    expect(legalPage).toContain("documentId === 'cookie-policy'");
    expect(legalPage).toContain('AnalyticsConsentControls');
  });
});
