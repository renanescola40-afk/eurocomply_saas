import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/team/invites/route.ts';
const queryPath = 'src/server/queries/invites.ts';

describe('team invitation creation audit persistence', () => {
  it('requires durable creation audit evidence before email delivery or success', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const audit = await createAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain("return noStoreJson({ error: 'team_invite_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const sendEmailIndex = source.indexOf('const delivery = await sendEmail({');
    const successResponseIndex = source.indexOf('auditPersisted: true');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(sendEmailIndex).toBeGreaterThan(auditGuardIndex);
    expect(successResponseIndex).toBeGreaterThan(sendEmailIndex);
    expect(source).not.toContain('auditPersisted: audit.persisted');
  });

  it('attempts a tenant-scoped pending-invitation compensation delete', () => {
    const routeSource = readFileSync(routePath, 'utf8');
    const querySource = readFileSync(queryPath, 'utf8');

    expect(routeSource).toContain('await deleteOrganizationInvite({');
    expect(routeSource).toContain('organizationId: organization.id');
    expect(routeSource).toContain('invitationId: result.invite.id');
    expect(routeSource).toContain("area: 'team_invitation_audit_compensation'");

    expect(querySource).toContain(".from('invitations')");
    expect(querySource).toContain('.delete()');
    expect(querySource).toContain(".eq('organization_id', input.organizationId)");
    expect(querySource).toContain(".eq('id', input.invitationId)");
    expect(querySource).toContain(".is('accepted_at', null)");
  });

  it('preserves authorization, origin, rate-limit, step-up, entitlement, and payload controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'manage_team'");
    expect(source).toContain('requireTrustedMutation(request');
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain('requireStepUpForRequest({');
    expect(source).toContain('getOrganizationEntitlements(organization.id)');
    expect(source).toContain('readBoundedJsonRequest(request');
    expect(source).toContain('inviteSchema.safeParse(payload)');
  });
});