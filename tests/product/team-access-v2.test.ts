import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const TEAM_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/team/page.tsx', import.meta.url);
const TEAM_SETTINGS = new URL('../../src/components/team/team-settings-section.tsx', import.meta.url);
const TEAM_MANAGEMENT = new URL('../../src/components/team/team-management-card.tsx', import.meta.url);

describe('enterprise team access V2', () => {
  it('preserves team permission, entitlement and seat-capacity boundaries', async () => {
    const page = await readFile(TEAM_PAGE, 'utf8');

    expect(page).toContain("roleHasPermission(organization.role, 'manage_team')");
    expect(page).toContain("isWithinPlanLimit(billing.plan, 'users', billing.usage.users)");
    expect(page).toContain('entitlements.employeeInvites && withinSeatCapacity');
    expect(page).toContain("isPlanAtLeast(entitlements.plan, 'enterprise')");
    expect(page).toContain('canInviteMembers={canInviteMembers}');
    expect(page).toContain('canInviteAdmin={canInviteAdmin}');
  });

  it('keeps step-up MFA around team mutations', async () => {
    const source = await readFile(TEAM_SETTINGS, 'utf8');

    expect(source).toContain('STEP_UP_TOKEN_HEADER');
    expect(source).toContain("action=\"manage_team\"");
    expect(source).toContain("fetch('/api/team/invites'");
    expect(source).toContain("fetch('/api/team/members/remove'");
    expect(source).toContain("fetch('/api/team/invitations/cancel'");
    expect(source).toContain('<StepUpMfaDialog');
  });

  it('renders members and pending invitations as enterprise access tables', async () => {
    const source = await readFile(TEAM_MANAGEMENT, 'utf8');

    expect(source).toContain('<table');
    expect(source).toContain('members.map');
    expect(source).toContain('invitations.map');
    expect(source).toContain('member.role');
    expect(source).toContain('invitation.role');
    expect(source).toContain('invitation.expires_at');
    expect(source).toContain('<TeamActionButton');
  });
});
