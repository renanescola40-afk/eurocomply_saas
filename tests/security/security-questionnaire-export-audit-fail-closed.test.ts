import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/security-questionnaire/export/route.ts';

describe('security questionnaire export audit persistence', () => {
  it('does not return the export when its audit event is not persisted', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const auditResult = await createAuditEvent({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("area: 'security_questionnaire_export_audit'");
    expect(source).toContain(
      "return noStoreJson({ error: 'security_questionnaire_export_audit_unavailable' }, { status: 503 });",
    );

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const downloadIndex = source.indexOf('return jsonDownloadResponse(exportPayload, filename);');

    expect(auditGuardIndex).toBeGreaterThan(-1);
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
