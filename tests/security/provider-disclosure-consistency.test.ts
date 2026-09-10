import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();

const disclosurePaths = [
  'src/lib/trust-center/content.ts',
  'src/components/trust/provider-runtime-disclosure.tsx',
  'src/app/[locale]/transfers/page.tsx',
  'docs/trust/SUBPROCESSORS.md',
  'docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md',
  'docs/legal-review-preparation/legal-pack/SUBPROCESSOR_REGISTER_REVIEW_DRAFT.md',
] as const;

function read(relativePath: string) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

describe('security-critical provider disclosure consistency', () => {
  it('keeps Upstash visible across authoritative provider and transfer surfaces', () => {
    const rateLimitRuntime = read('src/server/security/rate-limit.ts');

    expect(rateLimitRuntime).toContain('UPSTASH_REDIS_REST_URL');
    expect(rateLimitRuntime).toContain('UPSTASH_REDIS_REST_TOKEN');

    for (const relativePath of disclosurePaths) {
      expect(read(relativePath), `${relativePath} must disclose the Upstash integration`).toMatch(/\bUpstash\b/i);
    }
  });

  it('routes the explicit public subprocessors page through the localized evidence authority', () => {
    const route = read('src/app/[locale]/subprocessors/page.tsx');

    expect(route).toContain("import { TrustCenterPage } from '@/components/trust/trust-page'");
    expect(route).toContain("getLocalizedTrustCenterPage('subprocessors', locale)");
    expect(route).toContain('applyVerifiedTrustAuthority');
    expect(route).not.toContain("@/components/marketing/trust-center-page");
  });

  it('renders the runtime-evidence boundary with explicit EN/PT copy and a fail-closed English fallback', () => {
    const trustPage = read('src/components/trust/trust-page.tsx');
    const disclosure = read('src/components/trust/provider-runtime-disclosure.tsx');

    expect(trustPage).toContain('<ProviderRuntimeDisclosure locale={locale} slug={page.slug} />');
    expect(disclosure).toContain("slug !== 'subprocessors'");
    expect(disclosure).toContain('Upstash');
    expect(disclosure).toContain('PostHog');
    expect(disclosure).toContain('const en: ProviderDisclosureCopy = {');
    expect(disclosure).toContain('const pt: ProviderDisclosureCopy = {');
    expect(disclosure).toContain('const copy: Partial<Record<Locale, ProviderDisclosureCopy>> = { en, pt }');
    expect(disclosure).toContain("const contentLocale: Locale = copy[locale] ? locale : 'en';");
    expect(disclosure).toContain('const text = copy[contentLocale] ?? en');
    expect(disclosure).toContain('lang={contentLocale}');
  });

  it('does not convert runtime presence into unsupported account-contract claims', () => {
    const evidenceRegister = read('docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md');
    const legalDraft = read('docs/legal-review-preparation/legal-pack/SUBPROCESSOR_REGISTER_REVIEW_DRAFT.md');

    expect(evidenceRegister).toContain('PROVIDER_FACTUAL_RECONCILIATION=CURRENT_TERMINAL_ADDENDUM_ACTIVE');
    expect(evidenceRegister).toContain('RUNTIME_INTEGRATION_PRESENT / CURRENT_PROTECTED_PROVIDER_ACCEPTANCE_OPEN / ACCOUNT_FACTS_OPEN');
    expect(evidenceRegister).toContain('ACCOUNT_LEGAL_FACTS_OPEN=OPEN');
    expect(evidenceRegister).toContain('PRIVACY_GDPR_LEGAL_INTERPRETATION=WAITING_QUALIFIED_HUMAN');
    expect(legalDraft).toContain('ACCOUNT_SPECIFIC_PROVIDER_CONTRACT_FACTS=PARTIAL_OPEN');
    expect(legalDraft).toContain('not** by itself contractual authorisation');
    expect(legalDraft).toContain('SUBPROCESSOR_REGISTER_FINAL=BLOCKED_FINAL_FACTS_AND_QUALIFIED_REVIEW');
  });

  it('keeps the connected PostHog project separated from Production proof', () => {
    const evidenceRegister = read('docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md');

    expect(evidenceRegister).toContain('POSTHOG_CONNECTED_PROJECT_REVALIDATION=PASS_NON_PRODUCTION');
    expect(evidenceRegister).toContain('POSTHOG_CONNECTED_PROJECT_PROMOTED_AS_PRODUCTION=false');
    expect(evidenceRegister).toContain('POSTHOG_PRODUCTION_ACCOUNT_RECOVERY=OPEN');
    expect(evidenceRegister).toContain('ACCOUNT_FACTS_OPEN');
    expect(evidenceRegister).not.toContain('POSTHOG_CONNECTED_PROJECT_PROMOTED_AS_PRODUCTION=true');
  });

  it('does not republish superseded Upstash or Sentry release proof as current buyer truth', () => {
    const buyerSurfaces = [
      read('src/lib/trust/procurement-pack.ts'),
      read('src/components/trust/provider-runtime-disclosure.tsx'),
      read('src/app/[locale]/transfers/page.tsx'),
      read('docs/trust/SUBPROCESSORS.md'),
    ];

    for (const source of buyerSurfaces) {
      expect(source).not.toMatch(/fresh current[^\n]{0,120}\bUpstash\b/i);
      expect(source).not.toMatch(/\bUpstash\b[^\n]{0,160}fresh current/i);
      expect(source).not.toMatch(/current[^\n]{0,120}\bSentry\b[^\n]{0,120}(release binding|release-binding) (is )?(proven|evidenced)/i);
    }

    expect(buyerSurfaces.join('\n')).toMatch(/historical/i);
  });

  it('retains GitHub Actions transient Production-data processing disclosure', () => {
    const publicPack = read('src/lib/trust/procurement-pack.ts');
    const runtimeDisclosure = read('src/components/trust/provider-runtime-disclosure.tsx');
    const transfers = read('src/app/[locale]/transfers/page.tsx');
    const subprocessors = read('docs/trust/SUBPROCESSORS.md');

    expect(publicPack).toMatch(/GitHub-hosted runners[^\n]{0,220}(DPA|legal|transfer)/i);
    expect(runtimeDisclosure).toMatch(/GitHub-hosted runners[^\n]{0,220}(DPA|transfer|legal)/i);
    expect(transfers).toMatch(/GitHub-hosted runners[^\n]{0,220}(DPA|transfer)/i);
    expect(subprocessors).toMatch(/GitHub-hosted runners[^\n]{0,260}(DPA|transfer|legal)/i);
  });
});
