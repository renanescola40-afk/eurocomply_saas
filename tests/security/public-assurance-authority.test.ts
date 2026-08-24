import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const SECURITY_EMAIL = 'comercial@risckcomply.com';
const UNVERIFIED_SECURITY_EMAIL = 'security@risckcomply.com';
const STATUS_URL = 'https://risckcomplystatus1.statuspage.io/';

describe('verified public assurance authorities', () => {
  it('publishes only the reachable corporate security contact on canonical public surfaces', () => {
    const securityPolicy = read('SECURITY.md');
    const verifiedAuthority = read('src/lib/trust-center/verified-authority.ts');
    const trustRoute = read('src/app/[locale]/trust/page.tsx');
    const securityRoute = read('src/app/[locale]/security/page.tsx');

    expect(securityPolicy).toContain(SECURITY_EMAIL);
    expect(verifiedAuthority).toContain(SECURITY_EMAIL);
    expect(securityPolicy).not.toContain(UNVERIFIED_SECURITY_EMAIL);
    expect(verifiedAuthority).not.toContain(UNVERIFIED_SECURITY_EMAIL);
    expect(securityPolicy).not.toMatch(/@gmail\.com/i);
    expect(verifiedAuthority).not.toMatch(/@gmail\.com/i);

    for (const route of [trustRoute, securityRoute]) {
      expect(route).toContain('applyVerifiedTrustAuthority');
      expect(route).toContain('getLocalizedTrustCenterPage');
      expect(route).toContain("@/components/trust/trust-page");
    }
  });

  it('forces localized vulnerability disclosure through the verified authority layer', () => {
    const route = read('src/app/[locale]/[trustPage]/page.tsx');
    const authority = read('src/lib/trust-center/verified-authority.ts');

    expect(route).toContain('applyVerifiedTrustAuthority');
    expect(route).toContain('getLocalizedTrustCenterPage');
    expect(authority).toContain("page.slug === 'vulnerability-disclosure'");
    expect(authority).toContain(SECURITY_EMAIL);
  });

  it('links the localized /status route to the verified public Statuspage authority', () => {
    const route = read('src/app/[locale]/status/page.tsx');
    const statusPage = read('src/components/marketing/verified-status-page.tsx');
    const trustContent = read('src/lib/trust-center/content.ts');
    const authority = read('src/lib/trust-center/verified-authority.ts');

    expect(route).toContain('VerifiedStatusPage');
    expect(statusPage).toContain('VERIFIED_STATUS_PAGE_URL');
    expect(authority).toContain(STATUS_URL);
    expect(trustContent).toContain(STATUS_URL);
    expect(statusPage).not.toContain('Live monitoring integration pending');
    expect(trustContent).not.toContain('Static status page. Live monitoring integration pending.');
    expect(trustContent).not.toContain('No live third-party status integration is connected');
  });

  it('keeps status and security claims conservative', () => {
    const statusPage = read('src/components/marketing/verified-status-page.tsx');
    const trustContent = read('src/lib/trust-center/content.ts');

    expect(statusPage).toContain('does not promise a contractual uptime percentage');
    expect(trustContent).toContain('Formal certifications and external assurance reports are not yet complete.');
    expect(trustContent).toContain('does not provide legal advice or guarantee compliance outcomes');
  });
});
