import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const MIDDLEWARE = new URL('../src/middleware.ts', import.meta.url);
const COMMERCIAL_POLICY = new URL('../src/lib/security/commercial-route-policy.ts', import.meta.url);
const LEGAL_PAGE = new URL('../src/components/legal/public-legal-review-page.tsx', import.meta.url);
const PRIVACY_PAGE = new URL('../src/app/[locale]/privacy/page.tsx', import.meta.url);
const DPA_PAGE = new URL('../src/app/[locale]/dpa/page.tsx', import.meta.url);
const TERMS_PAGE = new URL('../src/app/[locale]/terms/page.tsx', import.meta.url);
const COOKIE_PAGE = new URL('../src/app/[locale]/cookie-policy/page.tsx', import.meta.url);
const ACCEPTABLE_USE_PAGE = new URL('../src/app/[locale]/acceptable-use/page.tsx', import.meta.url);
const TRANSFERS_PAGE = new URL('../src/app/[locale]/transfers/page.tsx', import.meta.url);
const PROVIDER_DISCLOSURE = new URL('../src/components/trust/provider-runtime-disclosure.tsx', import.meta.url);
const CONSENT_BANNER = new URL('../src/components/analytics/AnalyticsConsentBanner.tsx', import.meta.url);

const PUBLIC_LEGAL_ROUTES = ['/privacy', '/dpa', '/terms', '/cookie-policy', '/acceptable-use', '/transfers'] as const;

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
    const [privacy, dpa, terms, cookie, acceptableUse, transfers] = await Promise.all([
      readFile(PRIVACY_PAGE, 'utf8'),
      readFile(DPA_PAGE, 'utf8'),
      readFile(TERMS_PAGE, 'utf8'),
      readFile(COOKIE_PAGE, 'utf8'),
      readFile(ACCEPTABLE_USE_PAGE, 'utf8'),
      readFile(TRANSFERS_PAGE, 'utf8'),
    ]);

    expect(privacy).toContain('version="0.2-review"');
    expect(dpa).toContain('version="0.2-review"');
    expect(terms).toContain('version="0.2-review"');
    expect(transfers).toContain('version="0.2-review"');
    for (const source of [privacy, dpa, terms, cookie, acceptableUse, transfers]) {
      expect(source).toContain('lastUpdated={LAST_UPDATED}');
      expect(source).not.toMatch(/\[COMPANY|\[ADDRESS|\bTODO\b|\bTBD\b|example\.com/i);
    }

    for (const source of [cookie, acceptableUse]) {
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

  it('publishes the Article 28 DPA structure without fabricating an executed agreement', async () => {
    const source = await readFile(DPA_PAGE, 'utf8');

    expect(source).toContain('documentId="data-processing-addendum"');
    expect(source).toContain('Parties, status and scope');
    expect(source).toContain('Controller and processor roles');
    expect(source).toContain('Processing details');
    expect(source).toContain('Documented instructions');
    expect(source).toContain('Confidentiality and access control');
    expect(source).toContain('Security and technical measures');
    expect(source).toContain('Subprocessors');
    expect(source).toContain('International transfers');
    expect(source).toContain('Data-subject request assistance');
    expect(source).toContain('Security, DPIA and prior-consultation assistance');
    expect(source).toContain('Personal-data breaches');
    expect(source).toContain('Return, deletion and retention');
    expect(source).toContain('Information and audit rights');
    expect(source).toContain('Precedence, liability and final acceptance');
    expect(source).toContain('eu-west-1 (Ireland)');
    expect(source).toContain('Decision (EU) 2021/915');
    expect(source).toContain('REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED');

    expect(source).toContain('final RISCK COMPLY contracting/operator legal entity and its registered identifiers are still pending authoritative founder/entity confirmation');
    expect(source).not.toContain('SAMUEL CERQUEIRA, UNIPESSOAL LDA');
    expect(source).not.toMatch(/\bNIF\b|\bNIPC\b/);
    expect(source).not.toContain('99.9%');
  });

  it('fails untranslated DPA locales closed to the complete English clause set', async () => {
    const source = await readFile(DPA_PAGE, 'utf8');

    expect(source).toContain('const copy: Partial<Record<Locale, DpaCopy>> = { en, pt }');
    expect(source).toContain('const page = copy[locale] ?? en');
    expect(source).toContain('Special-category or criminal-offence data is not accepted as an ordinary default use case');
    expect(source).toContain('unless Union or Member-State law requires otherwise');
    expect(source).toContain('If an instruction appears to infringe applicable data-protection law');
  });

  it('publishes the Terms contract structure while preserving the operator/contracting and counsel boundaries', async () => {
    const source = await readFile(TERMS_PAGE, 'utf8');

    expect(source).toContain('documentId="terms-of-service"');
    expect(source).toContain('version="0.2-review"');
    expect(source).toContain('Parties, status and business scope');
    expect(source).toContain('Service and product boundary');
    expect(source).toContain('Accounts, organisations and authorised users');
    expect(source).toContain('Customer content and instructions');
    expect(source).toContain('AI and compliance outputs');
    expect(source).toContain('Acceptable use');
    expect(source).toContain('Orders, plans, subscriptions and add-ons');
    expect(source).toContain('Taxes, refunds and payment failure — review boundary');
    expect(source).toContain('Confidentiality');
    expect(source).toContain('Data protection and security');
    expect(source).toContain('Service providers, subprocessors and international transfers');
    expect(source).toContain('Intellectual property and licence');
    expect(source).toContain('Suspension, termination and post-termination access');
    expect(source).toContain('Warranties and compliance disclaimers');
    expect(source).toContain('Indemnities and liability — counsel decision required');
    expect(source).toContain('Renewal, changes and order precedence');
    expect(source).toContain('Governing law, disputes and legal notices — review boundary');
    expect(source).toContain('Final acceptance boundary');
    expect(source).toContain('comercial@risckcomply.com');
    expect(source).toContain('REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED');

    expect(source).toContain('Current attributable evidence records an owner-designated RISCK COMPLY operator internally');
    expect(source).toContain('this public review draft does not publish a final customer-facing legal party identity');
    expect(source).toContain('Operator designation alone does not establish those customer-facing legal roles');
    expect(source).toContain('The current attributable owner position is no default general refund');
    expect(source).toContain('The owner has selected a 30-day post-termination customer export-window position');
    expect(source).toContain('The current attributable owner preference is Portuguese governing law');
    expect(source).toContain('No liability cap or indemnity is represented as effective by this review draft');

    expect(source).not.toMatch(/samuel\s+cerqueira,\s*unipessoal\s+lda\.?/i);
    expect(source).not.toMatch(/\bNIF\b|\bNIPC\b/);
    expect(source).not.toMatch(/€\s?(49|149|399|990)/);
    expect(source).not.toContain('99.9%');
  });

  it('fails untranslated Terms locales closed to complete English text with an explicit language boundary', async () => {
    const source = await readFile(TERMS_PAGE, 'utf8');

    expect(source).toContain('const copy: Partial<Record<Locale, TermsCopy>> = { en, pt }');
    expect(source).toContain("const contentLocale: Locale = copy[locale] ? locale : 'en';");
    expect(source).toContain('const page = copy[contentLocale] ?? en');
    expect(source).toContain('contentLanguage={contentLocale}');
    expect(source).toContain('No liability cap or indemnity is represented as effective by this review draft');
  });

  it('publishes current transfer facts without converting them into Chapter V acceptance', async () => {
    const source = await readFile(TRANSFERS_PAGE, 'utf8');

    expect(source).toContain('documentId="international-data-transfers"');
    expect(source).toContain('version="0.2-review"');
    expect(source).toContain('ACTIVE_HEALTHY in eu-west-1 (Ireland)');
    expect(source).toContain('connected Vercel team is currently Pro');
    expect(source).toContain('connected session currently exposes the LIVE RISCK COMPLY SAAS Stripe account');
    expect(source).toContain('account-detail revalidation attempted by this legal-assurance lane failed');
    expect(source).toContain('SCC_2021_914');
    expect(source).toContain('Decision (EU) 2021/915');
    expect(source).toContain('Decision (EU) 2021/914');
    expect(source).toContain('GitHub-hosted runners');
    expect(source).toContain('Upstash');
    expect(source).toContain('BLOCKED is the correct state');
    expect(source).toContain('does not represent any SCC as executed unless account-specific evidence supports it');

    expect(source).not.toContain('SCCs are executed');
    expect(source).not.toContain('all international transfers are compliant');
  });

  it('fails untranslated transfer locales closed to complete English text with an explicit language boundary', async () => {
    const [source, legalPage] = await Promise.all([
      readFile(TRANSFERS_PAGE, 'utf8'),
      readFile(LEGAL_PAGE, 'utf8'),
    ]);

    expect(source).toContain('const copy: Partial<Record<Locale, TransferCopy>> = { en, pt }');
    expect(source).toContain("const contentLocale: Locale = copy[locale] ? locale : 'en';");
    expect(source).toContain('const page = copy[contentLocale] ?? en');
    expect(source).toContain('contentLanguage={contentLocale}');
    expect(legalPage).toContain('contentLanguage?: Locale;');
    expect(legalPage).toContain('lang={contentLocale}');
  });

  it('dates provider revalidation explicitly and marks untranslated provider evidence as English', async () => {
    const source = await readFile(PROVIDER_DISCLOSURE, 'utf8');

    expect(source).toContain("const contentLocale: Locale = copy[locale] ? locale : 'en';");
    expect(source).toContain('lang={contentLocale}');
    expect(source).toContain('revalidated on 10 September 2026');
    expect(source).toContain('revalidados em 10 de setembro de 2026');
    expect(source).not.toContain('revalidated today');
    expect(source).not.toContain('revalidados hoje');
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
