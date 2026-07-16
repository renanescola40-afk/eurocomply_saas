import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const memberActions = readFileSync('src/server/actions/members.ts', 'utf8');
const teamSettings = readFileSync('src/components/team/team-settings-section.tsx', 'utf8');
const profileClient = readFileSync('src/app/[locale]/profile/profile-client.tsx', 'utf8');
const inviteRoute = readFileSync('src/app/api/team/invites/route.ts', 'utf8');

describe('canonical team invitation entrypoint', () => {
  it('does not retain a direct server action that bypasses the protected API', () => {
    expect(memberActions).not.toContain('inviteOrganizationMember');
    expect(memberActions).not.toMatch(/\.from\('invitations'\)\s*\.(?:insert|upsert)\(/);
    expect(memberActions).not.toContain('member_invitation_action');
  });

  it('routes every current invitation UI through the step-up-capable API', () => {
    expect(teamSettings).toContain("fetch('/api/team/invites'");
    expect(profileClient).toContain("fetch('/api/team/invites'");
    expect(teamSettings).not.toContain("from '@/server/actions/members'");
    expect(profileClient).not.toContain("from '@/server/actions/members'");
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
