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

  it('keeps the public procurement provider catalog on the current conservative evidence boundary', () => {
    const publicPack = read('src/lib/trust/procurement-pack.ts');
    const providerRegister = read('docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md');

    expect(publicPack).toContain("PROCUREMENT_PACK_VERSION = '2026-09-09'");
    expect(publicPack).toContain('Current V41 selected migrations are present live 13/13');
    expect(publicPack).toContain('Exact-current-main Production binding and protected runtime acceptance remain evidence-required');
    expect(publicPack).toContain('no legitimate LIVE subscription authority is currently credited');
    expect(publicPack).not.toContain('governed V21 Production promotion remains separate and currently unapplied');
    expect(publicPack).not.toContain('Current direct Production deployment binding is proven on the current release');

    expect(providerRegister).toContain('PROVIDER_FACTUAL_RECONCILIATION=CURRENT_CONNECTED_ACCOUNT_ADDENDUM_ACTIVE');
    expect(providerRegister).toContain('2026-09-09-provider-current-overlay.md');
    expect(providerRegister).toContain('SUPABASE_PROJECT_REGION=PASS_CURRENT_2026-09-10');
    expect(providerRegister).toContain('STRIPE_LIVE_ACCOUNT_DISCOVERY=PASS_CURRENT_2026-09-10');
    expect(providerRegister).toContain('PROTECTED_PROVIDER_RUNTIME_ACCEPTANCE=OPEN');
    expect(providerRegister).toContain('generic LIVE account discovery remain non-crediting for a real customer lifecycle');
  });
});
