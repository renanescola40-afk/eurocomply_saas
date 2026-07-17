import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/documents/[id]/approval/route.ts';

describe('document approval audit persistence', () => {
  it('does not report approval success when the durable audit event is unavailable', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const audit = await createAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain("return noStoreJson({ error: 'document_approval_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const notificationIndex = source.indexOf('const notification = await createNotification({');
    const successResponseIndex = source.indexOf('auditPersisted: true');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(notificationIndex).toBeGreaterThan(auditGuardIndex);
    expect(successResponseIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('attempts a tenant-scoped compare-and-set rollback after audit failure', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain(".update({ status: existingDocument.status })");
    expect(source).toContain(".eq('id', updatedDocument.id)");
    expect(source).toContain(".eq('organization_id', organization.id)");
    expect(source).toContain(".eq('status', nextStatus)");
    expect(source).toContain("'[documents] approval_audit_rollback_failed'");
  });

  it('preserves authorization, trusted-mutation, bounded-body, and tenant controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'manage_documents'");
    expect(source).toContain('requireTrustedMutation(request');
    expect(source).toContain('maxBytes: APPROVAL_JSON_MAX_BYTES');
    expect(source).toContain('assertApiResourceOrganization(existingDocument.organization_id, organization.id)');
  });
});
