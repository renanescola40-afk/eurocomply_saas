import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/enterprise-readiness/export/route.ts';

describe('enterprise readiness export audit persistence', () => {
  it('does not return the evidence export when its audit event is not persisted', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const auditResult = await createAuditEvent({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("area: 'enterprise_readiness_export_audit'");
    expect(source).toContain(
      "return noStoreJson({ error: 'enterprise_readiness_export_audit_unavailable' }, { status: 503 });",
    );

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const downloadIndex = source.indexOf('return jsonDownloadResponse(exportPayload, filename);');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(downloadIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('only represents a successful export as durably audited', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('attempted: true;');
    expect(source).toContain('persisted: true;');
    expect(source).not.toContain('persisted: false');
    expect(source).not.toContain('enterprise_readiness_export_audit_non_blocking');
  });
});
