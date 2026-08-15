import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const memberActions = readFileSync('src/server/actions/members.ts', 'utf8');
const teamSettings = readFileSync('src/components/team/team-settings-section.tsx', 'utf8');
const profilePage = readFileSync('src/app/[locale]/profile/page.tsx', 'utf8');
const inviteRoute = readFileSync('src/app/api/team/invites/route.ts', 'utf8');

describe('canonical team invitation entrypoint', () => {
  it('does not retain a direct server action that bypasses the protected API', () => {
    expect(memberActions).not.toContain('inviteOrganizationMember');
    expect(memberActions).not.toMatch(/\.from\('invitations'\)\s*\.(?:insert|upsert)\(/);
    expect(memberActions).not.toContain('member_invitation_action');
  });

  it('keeps invitation mutations in the dedicated team surface and step-up-capable API', () => {
    expect(teamSettings).toContain("fetch('/api/team/invites'");
    expect(teamSettings).not.toContain("from '@/server/actions/members'");

    // Profile is intentionally identity-only in the enterprise product shell.
    // It may link administrators to the dedicated team surface, but must not
    // regain an embedded invitation mutation or bypass the canonical API.
    expect(profilePage).toContain("/dashboard/organizations/team");
    expect(profilePage).not.toContain("fetch('/api/team/invites'");
    expect(profilePage).not.toContain("from '@/server/actions/members'");
  });

  it('keeps the canonical API behind authorization, step-up, entitlements and idempotent delivery', () => {
    expect(inviteRoute).toContain('requirePermission({');
    expect(inviteRoute).toContain('requireTrustedMutation(request');
    expect(inviteRoute).toContain('await requireStepUpForRequest({');
    expect(inviteRoute).toContain('getOrganizationEntitlements(organization.id)');
    expect(inviteRoute).toContain('createOrganizationInvite({');
    expect(inviteRoute).toContain('idempotencyKey: `team-invite:');
  });
});
