import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const auditLogSource = () => readFileSync('src/lib/security/audit-log.ts', 'utf8');

describe('audit log request-context privacy', () => {
  it('pseudonymizes normalized IP addresses before metadata persistence', () => {
    const source = auditLogSource();
    const normalizeIndex = source.indexOf('const ip = normalizeIpAddress(');
    const pseudonymizeIndex = source.indexOf('ipPseudonym: pseudonymizeIpAddress(ip)');
    const metadataIndex = source.indexOf('ipAddressPseudonym: ipPseudonym');

    expect(source).toContain("import { hashRateLimitIp } from '@/server/security/rate-limit';");
    expect(source).toContain('return value ? `sha256:${hashRateLimitIp(value)}` : null;');
    expect(source).not.toContain('ipAddress: ip,');
    expect(normalizeIndex).toBeGreaterThan(-1);
    expect(pseudonymizeIndex).toBeGreaterThan(normalizeIndex);
    expect(metadataIndex).toBeGreaterThan(pseudonymizeIndex);
  });

  it('keeps absent request IPs absent while retaining an explicit correlation fallback', () => {
    const source = auditLogSource();

    expect(source).toContain('return value ? `sha256:${hashRateLimitIp(value)}` : null;');
    expect(source).toContain("return { requestId: 'req_unavailable', ipPseudonym: null, userAgent: null };");
    expect(source).not.toContain("ipPseudonym: 'anonymous'");
  });
});
