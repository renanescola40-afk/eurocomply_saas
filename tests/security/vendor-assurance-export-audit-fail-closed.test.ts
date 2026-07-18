import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/vendor-assurance/export/route.ts';

describe('vendor assurance export audit persistence', () => {
  it('does not return the export when its audit event is not persisted', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const auditResult = await createAuditEvent({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("area: 'vendor_assurance_export_audit'");
    expect(source).toContain(
      "return noStoreJson({ error: 'vendor_assurance_export_audit_unavailable' }, { status: 503 });",
    );

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const filenameIndex = source.indexOf('const filename = sanitizeDocumentDownloadFileName(');
    const downloadIndex = source.indexOf('return jsonDownloadResponse(exportPayload, filename);');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(filenameIndex).toBeGreaterThan(auditGuardIndex);
    expect(downloadIndex).toBeGreaterThan(filenameIndex);
  });
});
