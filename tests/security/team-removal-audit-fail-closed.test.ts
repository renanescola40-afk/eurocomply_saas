import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/team/members/remove/route.ts';

describe('team member removal audit persistence', () => {
  it('does not report a privileged member removal as successful without durable audit evidence', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const audit = await createAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain("return noStoreJson({ error: 'team_member_removal_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const successResponseIndex = source.indexOf('auditPersisted: true');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(successResponseIndex).toBeGreaterThan(auditGuardIndex);
    expect(source).not.toContain('auditPersisted: audit.persisted');
  });

  it('attempts to restore the exact removed tenant membership after audit persistence fails', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("await supabase.from('organization_members').insert({");
    expect(source).toContain('id: removal.affected_member_id ?? member.id');
    expect(source).toContain('organization_id: organization.id');
    expect(source).toContain('user_id: removal.affected_user_id ?? member.user_id');
    expect(source).toContain('role: removal.previous_role ?? member.role');
    expect(source).toContain("area: 'team_member_removal_audit_rollback'");
  });

  it('preserves tenant, permission, mutation, rate-limit, step-up, self-removal, and last-owner controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'manage_team'");
    expect(source).toContain('requireTrustedMutation(request');
    expect(source).toContain('requireStepUpForRequest({');
    expect(source).toContain(".eq('organization_id', organization.id)");
    expect(source).toContain('member.user_id === user.id');
    expect(source).toContain("removal.outcome === 'last_owner'");
    expect(source).toContain('limit: RATE_LIMIT_MAX_ATTEMPTS');
  });
});
