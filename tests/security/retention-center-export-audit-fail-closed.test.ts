import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/retention-center/export/route.ts';

describe('retention center export audit persistence', () => {
  it('does not return the export when its audit event is not persisted', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const auditResult = await createAuditEvent({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("console.error('[retention-center] export_audit_unavailable')");
    expect(source).toContain(
      "return noStoreJson({ error: 'retention_policy_export_audit_unavailable' }, { status: 503 });",
    );

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const filenameIndex = source.indexOf('const filename = sanitizeDocumentDownloadFileName');
    const downloadIndex = source.indexOf('return jsonDownloadResponse(exportPayload, filename)');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(filenameIndex).toBeGreaterThan(auditGuardIndex);
    expect(downloadIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('keeps the existing export controls in place', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'export_data'");
    expect(source).toContain("assertPlanAtLeast(organization.id, 'business')");
    expect(source).toContain("action: 'export_data'");
    expect(source).toContain('checkDistributedRateLimit({');
    expect(source).toContain('buildEvidencePackIntegrity(payload)');
    expect(source).toContain('noStoreDownload(');
  });
});
