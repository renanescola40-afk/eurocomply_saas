import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/security/settings/route.ts';

describe('security settings audit persistence', () => {
  it('does not report a security control change as successful without durable audit evidence', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const audit = await createAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain("return noStoreJson({ error: 'security_settings_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const successResponseIndex = source.indexOf('auditPersisted: true');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(successResponseIndex).toBeGreaterThan(auditGuardIndex);
    expect(source).not.toContain('auditPersisted: audit.persisted');
  });

  it('captures and restores the previous tenant-scoped settings after audit failure', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const { data: previousSettings, error: previousSettingsError }');
    expect(source).toContain(".eq('organization_id', organization.id)");
    expect(source).toContain('.upsert(previousSettings');
    expect(source).toContain(".delete()\n            .eq('organization_id', organization.id)");
    expect(source).toContain("console.error('security_settings_audit_compensation_failed')");
  });

  it('preserves permission, trusted-mutation, rate-limit, and step-up controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'manage_settings'");
    expect(source).toContain('requireTrustedMutation(request');
    expect(source).toContain("key: `security-settings:${organization.id}:${user.id}`");
    expect(source).toContain('requireStepUpForRequest({');
    expect(source).toContain("action: 'change_security_settings'");
  });
});
