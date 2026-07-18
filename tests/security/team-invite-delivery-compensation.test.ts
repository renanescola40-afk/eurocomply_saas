import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const routePath = path.join(process.cwd(), 'src/app/api/team/invites/route.ts');
const source = fs.readFileSync(routePath, 'utf8');

describe('team invitation delivery compensation', () => {
  it('revokes the exact tenant-scoped invitation before returning delivery failure', () => {
    const deliveryCatch = source.indexOf('catch (emailError)');
    const compensationArea = source.indexOf("area: 'team_invitation_delivery_compensation'", deliveryCatch);
    const deleteCall = source.indexOf('await deleteOrganizationInvite({', deliveryCatch);
    const failureResponse = source.indexOf("error: 'invitation_delivery_failed'", deliveryCatch);

    expect(deliveryCatch).toBeGreaterThan(-1);
    expect(deleteCall).toBeGreaterThan(deliveryCatch);
    expect(compensationArea).toBeGreaterThan(deleteCall);
    expect(failureResponse).toBeGreaterThan(compensationArea);

    const compensationBlock = source.slice(deleteCall, failureResponse);
    expect(compensationBlock).toContain('organizationId: organization.id');
    expect(compensationBlock).toContain('invitationId: result.invite.id');
    expect(compensationBlock).toContain('inviteRevoked = true');
  });

  it('records truthful compensation state without weakening existing controls', () => {
    expect(source).toContain("policy: 'team-management'");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("permission: 'manage_team'");
    expect(source).toContain("action: 'manage_team'");
    expect(source).toContain("action: 'team_invite_created'");
    expect(source).toContain("action: 'team_invite_delivery_failed'");
    expect(source).toContain('inviteRevoked,');
    expect(source).toContain('persisted: !inviteRevoked');
    expect(source).toContain('auditPersisted: failedAudit.persisted');
  });
});
