import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/document-downloads.ts';

describe('document signed URL audit persistence', () => {
  it('does not disclose a signed URL when durable audit persistence is unavailable', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain('const auditResult = await logAuditEvent({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("throw actionError('Document access is temporarily unavailable');");

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const signedUrlReturnIndex = source.indexOf('signedUrl: data.signedUrl');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(signedUrlReturnIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('preserves tenant, permission, storage-path, and fail-closed rate-limit controls', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain(".in('organization_id', organizationIds)");
    expect(source).toContain("assertCurrentUserCan(document.organization_id, user.id, 'documents:read')");
    expect(source).toContain('assertTenantStoragePathInOrganization(document.storage_path, document.organization_id)');
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain('SIGNED_URL_EXPIRES_IN_SECONDS');
  });
});
