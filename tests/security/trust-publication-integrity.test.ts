import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('canonical Trust Center publication integrity', () => {
  it('keeps the fail-closed legal publication state on the component served by public Trust routes', () => {
    const canonicalTrust = read('src/components/trust/trust-page.tsx');
    const trustRoute = read('src/app/[locale]/trust/page.tsx');
    const securityRoute = read('src/app/[locale]/security/page.tsx');

    expect(trustRoute).toContain("@/components/trust/trust-page");
    expect(securityRoute).toContain("@/components/trust/trust-page");
    expect(canonicalTrust).toContain('getLegalPublicationState');
    expect(canonicalTrust).toContain('{legalPublication.label}');
    expect(canonicalTrust).toContain('{legalPublication.notice}');
  });

  it('does not hard-code an unaccepted release subject into the buyer-facing procurement packet', () => {
    const procurement = read('docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md');

    expect(procurement).toContain('PROVIDER_FACTUAL_EVIDENCE_REGISTER.md');
    expect(procurement).toContain('release-specific claim remains `OPEN`');
    expect(procurement).not.toMatch(/\b[a-f0-9]{40}\b/i);
  });
});
