import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/members.ts';

describe('organization member removal rate limiting', () => {
  it('applies the distributed team-management policy before member lookup and removal', () => {
    const source = readFileSync(actionPath, 'utf8');
    const actionStart = source.indexOf('export async function removeOrganizationMember');
    const actionSource = source.slice(actionStart);

    expect(source).toContain("policy: 'team-management'");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("action: 'team_member_remove'");
    expect(source).toContain("route: 'server-action:team.member_remove'");
    expect(actionSource.indexOf('await enforceMemberRemovalRateLimit')).toBeGreaterThan(-1);
    expect(actionSource.indexOf('await enforceMemberRemovalRateLimit')).toBeLessThan(actionSource.indexOf(".from('organization_members')"));
    expect(actionSource.indexOf('await enforceMemberRemovalRateLimit')).toBeLessThan(actionSource.indexOf('.rpc(ATOMIC_MEMBER_REMOVAL_RPC'));
  });

  it('preserves authorization, tenant scoping, self-removal protection, and last-owner handling', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("await assertCurrentUserCan(input.organizationId, user.id, 'team:remove')");
    expect(source).toContain(".eq('organization_id', input.organizationId)");
    expect(source).toContain("throw actionError('You cannot remove your own access from here')");
    expect(source).toContain("throw actionError('Cannot remove the last organization owner')");
  });
});
