import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/team/members/remove/route.ts', 'utf8');
const adapter = readFileSync('src/server/queries/audit-events.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20261018113000_atomic_member_removal_with_chained_audit.sql', 'utf8');

describe('team member removal audit persistence (source-only)', () => {
  it('never reports success unless the audited atomic RPC returns removed', () => {
    expect(route).toContain('removeMemberWithChainedAuditAtomic({');
    expect(route).toContain('if (removalError || !removal)');
    expect(route).toContain("error: 'team_member_atomic_audit_unavailable'");
    expect(route).toContain("if (removal.outcome !== 'removed')");

    const auditGuardIndex = route.indexOf('if (removalError || !removal)');
    const outcomeGuardIndex = route.indexOf("if (removal.outcome !== 'removed')");
    const successResponseIndex = route.indexOf('auditPersisted: true');
    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(outcomeGuardIndex).toBeGreaterThan(auditGuardIndex);
    expect(successResponseIndex).toBeGreaterThan(outcomeGuardIndex);
  });

  it('uses one database transaction rather than an unsafe client-side compensation insert', () => {
    expect(route).not.toContain('createAuditEvent(');
    expect(route).not.toContain(".from('organization_members').insert(");
    expect(route).not.toContain('rollbackError');
    expect(adapter).toContain("admin.rpc('remove_organization_member_audited_atomic'");
    expect(adapter).toContain("error: 'audit_signing_unavailable'");
    expect(adapter).toContain("error: 'atomic_audit_or_member_removal_failed'");
    expect(migration).toContain('from public.remove_organization_member_atomic(');
    expect(migration).toContain('perform public.append_audit_event_chained(');
    expect(migration).toContain('insert into public.audit_logs');
    expect(migration).toContain('security definer');
    expect(migration).toContain('to service_role');
  });

  it('preserves tenant scope, permission, rate limit, Step-Up, self-removal and last-owner guards', () => {
    expect(route).toContain("permission: 'manage_team'");
    expect(route).toContain('requireTrustedMutation(request');
    expect(route).toContain('requireStepUpForRequest({');
    expect(route).toContain(".eq('organization_id', organization.id)");
    expect(route).toContain('member.user_id === user.id');
    expect(route).toContain("removal.outcome === 'last_owner'");
    expect(route).toContain('limit: RATE_LIMIT_MAX_ATTEMPTS');
  });
});
