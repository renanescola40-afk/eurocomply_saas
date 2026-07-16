import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const createQuery = fs.readFileSync('src/server/queries/invites.ts', 'utf8');
const createRoute = fs.readFileSync('src/app/api/team/invites/route.ts', 'utf8');
const cancelRoute = fs.readFileSync('src/app/api/team/invitations/cancel/route.ts', 'utf8');
const pendingQuery = fs.readFileSync('src/server/queries/members.ts', 'utf8');
const acceptanceAction = fs.readFileSync('src/server/actions/invitations.ts', 'utf8');

describe('team invitation lifecycle', () => {
  it('uses one canonical table for creation, pending-list, cancellation and acceptance', () => {
    expect(createQuery).toContain(".from('invitations')");
    expect(cancelRoute).toContain(".from('invitations')");
    expect(pendingQuery).toContain(".from('invitations')");
    expect(acceptanceAction).toContain("'accept_organization_invitation_atomic'");
    expect(createQuery).not.toContain(".from('organization_invites')");
    expect(cancelRoute).not.toContain(".from('organization_invites')");
  });

  it('delivers the raw token only through the invitation email', () => {
    expect(createRoute).toContain('/en/invite/${encodeURIComponent(result.token)}');
    expect(createRoute).toContain('const delivery = await sendEmail({');
    expect(createRoute).toContain('if (!delivery.sent)');
    expect(createRoute).not.toContain('token: result.token');
    expect(createRoute).not.toContain('tokenFingerprint: result.tokenFingerprint');
    expect(createRoute).toContain("error: 'invitation_delivery_failed'");
  });

  it('normalizes roles into the values accepted by the atomic membership grant', () => {
    expect(createQuery).toContain("Admin: 'admin'");
    expect(createQuery).toContain("Editor: 'editor'");
    expect(createQuery).toContain("Visualizador: 'viewer'");
  });
});
