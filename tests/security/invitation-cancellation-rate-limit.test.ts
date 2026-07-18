import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/members.ts';

describe('organization invitation cancellation rate limiting', () => {
  it('applies the distributed team-management policy before invitation lookup and deletion', () => {
    const source = readFileSync(actionPath, 'utf8');
    const actionStart = source.indexOf('export async function cancelOrganizationInvitation');
    const nextActionStart = source.indexOf('export async function removeOrganizationMember');
    const actionSource = source.slice(actionStart, nextActionStart);

    expect(source).toContain("policy: 'team-management'");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("action: 'team_invite_cancel'");
    expect(source).toContain("route: 'server-action:team.invite_cancel'");
    expect(actionSource.indexOf('await enforceInvitationCancellationRateLimit')).toBeGreaterThan(-1);
    expect(actionSource.indexOf('await enforceInvitationCancellationRateLimit')).toBeLessThan(
      actionSource.indexOf(".from('invitations')"),
    );
    expect(actionSource.indexOf('await enforceInvitationCancellationRateLimit')).toBeLessThan(
      actionSource.indexOf('.delete()'),
    );
  });

  it('preserves authorization, tenant scoping, pending-state checks, and audit logging', () => {
    const source = readFileSync(actionPath, 'utf8');
    const actionStart = source.indexOf('export async function cancelOrganizationInvitation');
    const nextActionStart = source.indexOf('export async function removeOrganizationMember');
    const actionSource = source.slice(actionStart, nextActionStart);

    expect(actionSource).toContain("await assertCurrentUserCan(input.organizationId, user.id, 'team:remove')");
    expect(actionSource).toContain(".eq('organization_id', input.organizationId)");
    expect(actionSource).toContain(".is('accepted_at', null)");
    expect(actionSource).toContain("action: 'team.invite_cancelled'");
  });
});
