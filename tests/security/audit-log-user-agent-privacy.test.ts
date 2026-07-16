import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const auditLogSource = () => readFileSync('src/lib/security/audit-log.ts', 'utf8');

describe('audit log request-context privacy', () => {
  it('stores only a derived user-agent identifier in audit metadata', () => {
    const source = auditLogSource();

    expect(source).toContain("import { hashRateLimitIp, hashRateLimitUserAgent } from '@/server/security/rate-limit';");
    expect(source).toContain('function pseudonymizeUserAgent(value: string | null)');
    expect(source).toContain('`sha256:${hashRateLimitUserAgent(value)}`');
    expect(source).toContain('userAgentPseudonym: pseudonymizeUserAgent(userAgent)');
    expect(source).toContain('userAgentPseudonym,');
    expect(source).not.toContain('requestContext: {\n      requestId,\n      ipAddressPseudonym: ipPseudonym,\n      userAgent,');
  });

  it('keeps absent request user agents nullable', () => {
    const source = auditLogSource();

    expect(source).toContain("return value ? `sha256:${hashRateLimitUserAgent(value)}` : null;");
    expect(source).toContain("return { requestId: 'req_unavailable', ipPseudonym: null, userAgentPseudonym: null };");
  });
});
