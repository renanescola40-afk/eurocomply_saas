import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const marketingAndTrustFiles = [
  'src/components/marketing/enterprise-home.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'src/app/[locale]/trust/page.tsx',
  'src/lib/trust-center/content.ts',
];

const forbiddenClaimPatterns = [
  { label: 'absolute compliance percentage', pattern: /\b100%\s+(?:EU AI Act\s+)?compliant\b/i },
  { label: 'guaranteed compliance', pattern: /\bguaranteed\s+(?:EU AI Act\s+)?compliance\b/i },
  { label: 'official EU approval', pattern: /\bofficially\s+(?:EU\s+)?approved\b/i },
  { label: 'unsupported certification claim', pattern: /\bcertified\s+(?:EU AI Act\s+)?compliance\b/i },
  { label: 'legal counsel replacement claim', pattern: /\breplaces\s+(?:legal counsel|lawyers?)\b/i },
  { label: 'production guarantee without evidence language', pattern: /\bproduction-ready\s+guarantee\b/i },
];

function readRepoFile(filePath: string) {
  return readFileSync(join(process.cwd(), filePath), 'utf8');
}

function sourceForUnsupportedClaimScan(filePath: string) {
  const source = readRepoFile(filePath);

  if (filePath === 'src/lib/trust-center/content.ts') {
    return source.replace(/export const TRUST_PROHIBITED_CLAIMS = \[[\s\S]*?\] as const;/, '');
  }

  return source;
}

describe('public trust and marketing claim safety', () => {
  it('does not make fake production, legal, certification, or absolute compliance claims', () => {
    const violations = marketingAndTrustFiles.flatMap((filePath) => {
      const source = sourceForUnsupportedClaimScan(filePath);

      return forbiddenClaimPatterns
        .filter(({ pattern }) => pattern.test(source))
        .map(({ label }) => `${filePath}: ${label}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps evidence-bound disclaimer language on the main enterprise landing copy', () => {
    const source = readRepoFile('src/components/marketing/enterprise-home.tsx');

    expect(source).toMatch(/does not provide legal advice, certification or a compliance guarantee/i);
    expect(source).toContain('EnterpriseLandingV2');
    expect(source).toMatch(/Illustrative previews|Pré-visualizações ilustrativas/i);
    expect(source).toMatch(/not customer metrics or RISCK COMPLY production metrics/i);
    expect(source).not.toMatch(/\bguaranteed\s+(?:EU AI Act\s+)?compliance\b/i);
  });
});
