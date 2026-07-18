import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/documents/upload/route.ts';

describe('controlled document upload audit persistence', () => {
  it('does not return or notify for an accepted upload when durable audit persistence fails', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const auditResult = await auditUploadSecurityEvent({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("return noStoreJson({ error: 'document_upload_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const notificationIndex = source.indexOf('await createNotification({');
    const successIndex = source.lastIndexOf('document: persistedDocument');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(notificationIndex).toBeGreaterThan(auditGuardIndex);
    expect(successIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('compensates both exact tenant metadata and the uploaded storage object', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain(".from('documents')");
    expect(source).toContain(".eq('id', persistedDocument.id)");
    expect(source).toContain(".eq('organization_id', organization.id)");
    expect(source).toContain(".eq('storage_path', storagePath)");
    expect(source).toContain('storage.remove([storagePath])');
    expect(source).toContain("console.warn('[documents] upload_audit_compensation_failed'");
  });

  it('preserves origin, tenant, permission, quota, scanning, and fail-closed rate-limit controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('assertTrustedOrigin(request)');
    expect(source).toContain("permission: 'manage_documents'");
    expect(source).toContain('assertDocumentQuota(organization.id)');
    expect(source).toContain('scanValidatedUploadForMalware({');
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain('buildTenantScopedUploadPath({');
  });
});
