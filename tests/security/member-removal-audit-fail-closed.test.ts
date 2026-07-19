import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/members.ts';

describe('organization member removal audit persistence', () => {
  it('requires durable audit evidence before completing removal', () => {
    const source = readFileSync(actionPath, 'utf8');
    const removalStart = source.indexOf('export async function removeOrganizationMember');
    const removalSource = source.slice(removalStart);

    expect(removalSource).toContain("action: 'team.member_removed'");
    expect(removalSource).toContain('const audit = await logAuditEvent({');
    expect(removalSource).toContain('if (!audit.persisted)');
    expect(removalSource).toContain("throw actionError('Unable to remove member.')");
  });

  it('captures and restores the exact tenant-scoped membership row when auditing fails', () => {
    const source = readFileSync(actionPath, 'utf8');
    const removalStart = source.indexOf('export async function removeOrganizationMember');
    const removalSource = source.slice(removalStart);

    expect(removalSource).toContain(".from('organization_members')");
    expect(removalSource).toContain(".select('*')");
    expect(removalSource).toContain(".eq('id', input.memberId)");
    expect(removalSource).toContain(".eq('organization_id', input.organizationId)");
    expect(removalSource).toContain("await supabase.from('organization_members').insert(member)");
    expect(removalSource).toContain("area: 'team_remove_member_audit_rollback'");
  });

  it('preserves authorization, self-removal protection, atomic removal, and fail-closed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');
    const removalStart = source.indexOf('export async function removeOrganizationMember');
    const removalSource = source.slice(removalStart);

    expect(removalSource).toContain("assertCurrentUserCan(input.organizationId, user.id, 'team:remove')");
    expect(removalSource).toContain('await enforceMemberRemovalRateLimit');
    expect(removalSource).toContain('if (member.user_id === user.id)');
    expect(removalSource).toContain('supabase.rpc(ATOMIC_MEMBER_REMOVAL_RPC');
    expect(source).toContain("failureMode: 'fail-closed'");
  });
});
