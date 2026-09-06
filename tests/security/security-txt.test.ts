import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const securityTxt = readFileSync('public/.well-known/security.txt', 'utf8');
const securityPolicy = readFileSync('SECURITY.md', 'utf8');
const middleware = readFileSync('src/middleware.ts', 'utf8');

describe('RFC 9116 security.txt', () => {
  it('publishes the documented canonical security contact', () => {
    expect(securityTxt).toContain('Contact: mailto:comercial@risckcomply.com');
    expect(securityPolicy).toContain('comercial@risckcomply.com');
    expect(securityTxt).toContain('Canonical: https://www.risckcomply.com/.well-known/security.txt');
    expect(securityTxt).toContain('Policy: https://www.risckcomply.com/en/vulnerability-disclosure');
    expect(securityTxt).toContain('Preferred-Languages: en, pt');
  });

  it('has a parseable expiry that remains less than one year ahead', () => {
    const match = securityTxt.match(/^Expires:\s*(.+)$/m);
    expect(match).not.toBeNull();

    const expiresAt = Date.parse(match?.[1]?.trim() ?? '');
    const now = Date.now();
    const oneYear = 366 * 24 * 60 * 60 * 1000;

    expect(Number.isFinite(expiresAt)).toBe(true);
    expect(expiresAt).toBeGreaterThan(now);
    expect(expiresAt - now).toBeLessThan(oneYear);
  });

  it('keeps dotted well-known resources out of locale/auth handling', () => {
    const staticBypass = middleware.indexOf("pathname.includes('.')");
    const requestIdBoundary = middleware.indexOf('const requestId = createTrustedRequestId()');

    expect(staticBypass).toBeGreaterThan(-1);
    expect(requestIdBoundary).toBeGreaterThan(staticBypass);
  });
});
