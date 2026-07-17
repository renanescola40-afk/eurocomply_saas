import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/team/members/role/route.ts';

describe('team role change audit persistence', () => {
  it('does not report a privileged role change as successful without durable audit evidence', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const audit = await createAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain("return noStoreJson({ error: 'team_role_change_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const successResponseIndex = source.indexOf('auditPersisted: true');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(successResponseIndex).toBeGreaterThan(auditGuardIndex);
    expect(source).not.toContain('auditPersisted: audit.persisted');
  });

  it('attempts an atomic compare-and-set rollback after audit persistence fails', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const { data: rollbackData, error: rollbackError } = await supabase.rpc(ATOMIC_ROLE_TRANSITION_RPC, {');
    expect(source).toContain('p_expected_role: appliedRole');
    expect(source).toContain('p_next_role: member.role');
    expect(source).toContain("area: 'team_role_change_audit_rollback'");
  });

  it('preserves tenant, permission, mutation, rate-limit, step-up, and last-owner controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'manage_team'");
    expect(source).toContain('requireTrustedMutation(request');
    expect(source).toContain('requireStepUpForRequest({');
    expect(source).toContain(".eq('organization_id', organization.id)");
    expect(source).toContain("transition.outcome === 'last_owner'");
    expect(source).toContain('limit: RATE_LIMIT_MAX_ATTEMPTS');
  });
});
