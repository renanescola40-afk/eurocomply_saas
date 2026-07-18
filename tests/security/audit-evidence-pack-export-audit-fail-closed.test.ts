import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/app/api/audit/evidence-pack/route.ts', 'utf8');

describe('audit evidence pack export audit persistence', () => {
  it('does not disclose the evidence pack before durable audit persistence', () => {
    const auditIndex = source.indexOf('const auditResult = await createAuditEvent');
    const guardIndex = source.indexOf('if (!auditResult.persisted)');
    const filenameIndex = source.indexOf('const filename = `eurocomply-audit-evidence-pack-');
    const downloadIndex = source.indexOf('return jsonDownloadResponse(exportPayload, filename);');

    expect(auditIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(auditIndex);
    expect(filenameIndex).toBeGreaterThan(guardIndex);
    expect(downloadIndex).toBeGreaterThan(filenameIndex);
  });

  it('returns a no-store service-unavailable response when persistence fails', () => {
    expect(source).toContain("area: 'audit_evidence_pack_export_audit_persistence'");
    expect(source).toContain("return noStoreJson({ error: 'audit_evidence_pack_export_audit_unavailable' }, { status: 503 });");
  });
});
