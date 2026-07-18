import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/app/api/audit/chain/verify/route.ts', 'utf8');

describe('audit-chain verification audit persistence', () => {
  it('does not disclose verification results before durable audit persistence', () => {
    const auditIndex = source.indexOf('const verificationAuditEvent = await createAuditEvent');
    const guardIndex = source.indexOf('if (!verificationAuditEvent.persisted)');
    const responseIndex = source.indexOf('return noStoreJson({\n    organizationId: organization.id');

    expect(auditIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(auditIndex);
    expect(responseIndex).toBeGreaterThan(guardIndex);
  });

  it('returns a no-store service-unavailable response when persistence fails', () => {
    expect(source).toContain("console.warn('[audit-chain] verification_audit_unavailable')");
    expect(source).toContain("return noStoreJson({ error: 'audit_chain_verification_audit_unavailable' }, { status: 503 });");
  });

  it('only reports persisted true in successful verification responses', () => {
    expect(source).toContain('persisted: true,');
    expect(source).not.toContain('persisted: verificationAuditEvent.persisted,');
  });
});
