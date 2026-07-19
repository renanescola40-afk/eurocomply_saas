import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/members.ts';
const invitationPersistencePath = 'src/server/queries/invites.ts';

function readCancellationAction() {
  const source = readFileSync(actionPath, 'utf8');
  const actionStart = source.indexOf('export async function cancelOrganizationInvitation');
  const nextActionStart = source.indexOf('export async function removeOrganizationMember');
  return source.slice(actionStart, nextActionStart);
}

describe('organization invitation cancellation audit persistence', () => {
  it('captures the exact restorable invitation fields before deletion and checks audit persistence before success', () => {
    const actionSource = readCancellationAction();

    expect(actionSource).toContain(
      ".select('id,organization_id,email,role,token,invited_by,accepted_at,expires_at,created_at')",
    );
    expect(actionSource).toContain('const audit = await logAuditEvent');
    expect(actionSource).toContain('if (!audit.persisted)');
    expect(actionSource.indexOf('const audit = await logAuditEvent')).toBeGreaterThan(
      actionSource.indexOf('.delete()'),
    );
  });

  it('delegates exact restoration to the canonical invitation persistence service and sanitizes failures', () => {
    const actionSource = readCancellationAction();
    const persistenceSource = readFileSync(invitationPersistencePath, 'utf8');

    expect(actionSource).toContain('const restoration = await restoreOrganizationInvite({');
    expect(actionSource).not.toMatch(/\.from\('invitations'\)\s*\.insert\(/);
    expect(actionSource).toContain("new Error('Invitation cancellation audit compensation failed')");
    expect(actionSource).toContain("area: 'team_cancel_invitation_audit_compensation'");
    expect(actionSource).toContain('providerCode: restoration.providerCode');
    expect(actionSource).toContain("throw actionError('Unable to cancel invitation.')");

    expect(persistenceSource).toContain('export async function restoreOrganizationInvite');
    expect(persistenceSource).toContain('invitation.id !== input.invitationId');
    expect(persistenceSource).toContain('invitation.organization_id !== input.organizationId');
    expect(persistenceSource).toContain('invitation.accepted_at !== null');
    expect(persistenceSource).toContain('id: invitation.id');
    expect(persistenceSource).toContain('token: invitation.token');
    expect(persistenceSource).toContain('created_at: invitation.created_at');
  });

  it('preserves authorization, tenant scoping, pending-state checks, and fail-closed rate limiting', () => {
    const actionSource = readCancellationAction();

    expect(actionSource).toContain("await assertCurrentUserCan(input.organizationId, user.id, 'team:remove')");
    expect(actionSource).toContain('await enforceInvitationCancellationRateLimit');
    expect(actionSource).toContain(".eq('organization_id', input.organizationId)");
    expect(actionSource).toContain(".is('accepted_at', null)");
    expect(actionSource).toContain("action: 'team.invite_cancelled'");
  });
});
