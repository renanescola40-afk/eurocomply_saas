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

  it('renders the runtime-evidence boundary on translated public subprocessors pages', () => {
    const trustPage = read('src/components/trust/trust-page.tsx');
    const disclosure = read('src/components/trust/provider-runtime-disclosure.tsx');

    expect(trustPage).toContain('<ProviderRuntimeDisclosure locale={locale} slug={page.slug} />');
    expect(disclosure).toContain("slug !== 'subprocessors'");
    expect(disclosure).toContain('Upstash');
    expect(disclosure).toContain('PostHog');

    for (const locale of ['en', 'pt', 'es', 'fr', 'it', 'de']) {
      expect(disclosure, `provider runtime disclosure must define ${locale}`).toMatch(new RegExp(`\\b${locale}: \\{`));
    }
  });

  it('does not convert runtime presence into unsupported account-contract claims', () => {
    const evidenceRegister = read('docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md');
    const legalDraft = read('docs/legal-review-preparation/legal-pack/SUBPROCESSOR_REGISTER_REVIEW_DRAFT.md');

    expect(evidenceRegister).toContain('RUNTIME_BINDING_PROVEN');
    expect(evidenceRegister).toContain('ACCOUNT_LEGAL_FACTS_OPEN');
    expect(legalDraft).toContain('contractual facts open');
  });

  it('keeps the connected PostHog assurance project separated from Production proof', () => {
    const evidenceRegister = read('docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md');

    expect(evidenceRegister).toContain('CONNECTED_ASSURANCE_PROJECT_MISMATCH');
    expect(evidenceRegister).toContain('ACCOUNT_FACTS_OPEN');
    expect(evidenceRegister).not.toMatch(/connected assurance project[^\n]{0,160}\bProduction project confirmed\b/i);
  });
});
