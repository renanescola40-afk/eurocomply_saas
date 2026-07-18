import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/vendor-assurance/export/route.ts', 'utf8');

describe('vendor assurance export audit boundary', () => {
  it('fails closed before constructing or returning the download', () => {
    const auditCall = route.indexOf('const auditResult = await createAuditEvent({');
    const persistenceGuard = route.indexOf('if (!auditResult.persisted)');
    const stableError = route.indexOf("vendor_assurance_export_audit_unavailable");
    const filename = route.indexOf('const filename = sanitizeDocumentDownloadFileName(');
    const download = route.indexOf('return jsonDownloadResponse(exportPayload, filename);');

    expect(auditCall).toBeGreaterThan(-1);
    expect(persistenceGuard).toBeGreaterThan(auditCall);
    expect(stableError).toBeGreaterThan(persistenceGuard);
    expect(filename).toBeGreaterThan(persistenceGuard);
    expect(download).toBeGreaterThan(filename);
  });

  it('preserves the existing authorization and export hardening controls', () => {
    expect(route).toContain("permission: 'export_data'");
    expect(route).toContain("assertPlanAtLeast(organization.id, 'business')");
    expect(route).toContain("action: 'export_data'");
    expect(route).toContain('checkDistributedRateLimit({');
    expect(route).toContain('buildEvidencePackIntegrity(payload)');
    expect(route).toContain('noStoreDownload(');
    expect(route).toContain("'X-Content-Type-Options': 'nosniff'");
  });

  it('uses a sanitized fixed operational error path', () => {
    expect(route).toContain("new Error('Vendor assurance export audit persistence failed')");
    expect(route).toContain("area: 'vendor_assurance_export_audit'");
    expect(route).not.toContain('reportError(exportPayload');
    expect(route).not.toContain('reportError(payload');
  });
});
