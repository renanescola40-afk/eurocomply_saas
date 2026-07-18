import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/actions/organizations.ts', 'utf8');

describe('organization creation audit persistence', () => {
  it('does not disclose success or send onboarding email before durable audit persistence', () => {
    const auditIndex = source.indexOf('const audit = await logAuditEvent');
    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const emailIndex = source.indexOf('if (user.email)');
    const returnIndex = source.lastIndexOf('return organization;');

    expect(auditIndex).toBeGreaterThan(-1);
    expect(auditGuardIndex).toBeGreaterThan(auditIndex);
    expect(emailIndex).toBeGreaterThan(auditGuardIndex);
    expect(returnIndex).toBeGreaterThan(emailIndex);
  });

  it('compensates the exact newly created tenant when audit persistence fails', () => {
    expect(source).toContain(".from('organizations')");
    expect(source).toContain('.delete()');
    expect(source).toContain(".eq('id', organization.id)");
    expect(source).toContain(".eq('created_by', user.id)");
    expect(source).toContain(".eq('slug', organization.slug)");
    expect(source).toContain("area: 'organization_creation_audit_compensation'");
    expect(source).toContain("throw organizationActionError('Organization creation is temporarily unavailable')");
  });
});
