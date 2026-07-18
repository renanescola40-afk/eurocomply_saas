import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/gdpr/export/route.ts';

describe('GDPR export audit persistence', () => {
  it('does not return or announce the export when its audit event is not persisted', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const auditResult = await createAuditEvent({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("area: 'gdpr_export_audit'");
    expect(source).toContain(
      "return noStoreJson({ error: 'gdpr_export_audit_unavailable' }, { status: 503 });",
    );

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const notificationIndex = source.indexOf('await createNotification({');
    const downloadIndex = source.indexOf('return noStoreDownload(JSON.stringify(body, null, 2)');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(notificationIndex).toBeGreaterThan(auditGuardIndex);
    expect(downloadIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('reports audit unavailability without exposing export content', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("new Error('GDPR export audit persistence failed')");
    expect(source).not.toContain('exportBody, { status: 503');
    expect(source).not.toContain('tables: exportBody.tables');
  });
});
