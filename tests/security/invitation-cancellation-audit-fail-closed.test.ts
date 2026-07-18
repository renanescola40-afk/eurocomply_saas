import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/members.ts';

describe('organization invitation cancellation audit persistence', () => {
  it('captures the complete invitation before deletion and checks audit persistence before success', () => {
    const source = readFileSync(actionPath, 'utf8');
    const actionStart = source.indexOf('export async function cancelOrganizationInvitation');
    const nextActionStart = source.indexOf('export async function removeOrganizationMember');
    const actionSource = source.slice(actionStart, nextActionStart);

    expect(actionSource).toContain(".select('*')");
    expect(actionSource).toContain('const audit = await logAuditEvent');
    expect(actionSource).toContain('if (!audit.persisted)');
    expect(actionSource.indexOf('const audit = await logAuditEvent')).toBeGreaterThan(
      actionSource.indexOf('.delete()'),
    );
  });

  it('restores the exact invitation and reports only sanitized compensation context when auditing fails', () => {
    const source = readFileSync(actionPath, 'utf8');
    const actionStart = source.indexOf('export async function cancelOrganizationInvitation');
    const nextActionStart = source.indexOf('export async function removeOrganizationMember');
    const actionSource = source.slice(actionStart, nextActionStart);

    expect(actionSource).toContain(".from('invitations')");
    expect(actionSource).toContain('.insert(invitation)');
    expect(actionSource).toContain("area: 'team_cancel_invitation_audit_compensation'");
    expect(actionSource).toContain('providerCode: restoreError.code ?? null');
    expect(actionSource).toContain("throw actionError('Unable to cancel invitation.')");
    expect(actionSource).not.toContain('reportError(restoreError, invitation');
  });

  it('preserves authorization, tenant scoping, pending-state checks, and fail-closed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');
    const actionStart = source.indexOf('export async function cancelOrganizationInvitation');
    const nextActionStart = source.indexOf('export async function removeOrganizationMember');
    const actionSource = source.slice(actionStart, nextActionStart);

    expect(actionSource).toContain("await assertCurrentUserCan(input.organizationId, user.id, 'team:remove')");
    expect(actionSource).toContain('await enforceInvitationCancellationRateLimit');
    expect(actionSource).toContain(".eq('organization_id', input.organizationId)");
    expect(actionSource).toContain(".is('accepted_at', null)");
    expect(actionSource).toContain("action: 'team.invite_cancelled'");
  });
});
