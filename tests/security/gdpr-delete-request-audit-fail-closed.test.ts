import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/gdpr/delete-request/route.ts';

describe('GDPR deletion request audit persistence', () => {
  it('does not acknowledge a deletion request when durable audit persistence fails', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const audit = await createAuditEvent({');
    expect(source).toContain("action: 'gdpr_delete_requested'");
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain("error: 'gdpr_delete_request_audit_unavailable'");
    expect(source).toContain('}, { status: 503 });');

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const notificationIndex = source.indexOf('await createNotification({');
    const successResponseIndex = source.indexOf("message: 'Request received.");

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(notificationIndex).toBeGreaterThan(auditGuardIndex);
    expect(successResponseIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('preserves the existing high-risk mutation controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('assertTrustedOrigin(request)');
    expect(source).toContain("permission: 'manage_settings'");
    expect(source).toContain("policy: 'gdpr-delete'");
    expect(source).toContain("action: 'gdpr_delete'");
    expect(source).toContain('requireStepUpForRequest({');
    expect(source).toContain('maxBytes: DELETE_REQUEST_JSON_MAX_BYTES');
    expect(source).toContain('validateDeleteConfirmation(body)');
  });

  it('reports only stable operational context and returns a no-store response', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("area: 'gdpr_delete_request_audit'");
    expect(source).toContain('reason: audit.reason');
    expect(source).toContain('return noStoreJson({');
    expect(source).not.toContain('audit.error');
  });
});
