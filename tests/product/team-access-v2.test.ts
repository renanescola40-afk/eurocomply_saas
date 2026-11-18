import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const TEAM_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/team/page.tsx', import.meta.url);
const TEAM_SETTINGS = new URL('../../src/components/team/team-settings-section.tsx', import.meta.url);
const TEAM_MANAGEMENT = new URL('../../src/components/team/team-management-card.tsx', import.meta.url);
const TEAM_ACTION_BUTTON = new URL('../../src/components/team/team-action-button.tsx', import.meta.url);

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


  it('does not offer removal for Clerk-only members pending identity review', async () => {
    const source = await readFile(TEAM_MANAGEMENT, 'utf8');

    expect(source).toContain('const needsIdentityReview = !member.user_id;');
    expect(source).toContain('&& !isCurrentUser && !needsIdentityReview');
    expect(source).toContain('Identity review required');
    expect(source).toContain('needsIdentityReview ?');
    expect(source).toContain('onRemoveMember(member.id)');
    expect(source.indexOf('needsIdentityReview ?')).toBeLessThan(source.indexOf('onRemoveMember(member.id)'));
  });

  it('maps review-required API responses to user-facing guidance', async () => {
    const source = await readFile(TEAM_SETTINGS, 'utf8');

    expect(source).toContain('clerk_only_removal_requires_review:');
    expect(source).toContain('clerk_only_role_change_requires_review:');
    expect(source).toContain('until their identity has been reviewed');
    expect(source).toContain('TEAM_IDENTITY_ERROR_COPY[body.error]');
    expect(source).toContain('return identityReviewCopy ?? body?.message ?? body?.error ?? fallback;');
  });

  it('awaits team actions and shows async errors accessibly instead of discarding them', async () => {
    const source = await readFile(TEAM_ACTION_BUTTON, 'utf8');

    expect(source).toContain('const [pending, setPending] = useState(false)');
    expect(source).toContain('const [error, setError] = useState<string | null>(null)');
    expect(source).toContain('disabled={pending}');
    expect(source).toContain('await onConfirm()');
    expect(source).toContain('catch (cause)');
    expect(source).toContain('finally {');
    expect(source).toContain('role="alert"');
    expect(source).not.toContain('void onConfirm()');
  });

  it('preserves the confirmation prompt and MFA step-up for team mutations', async () => {
    const button = await readFile(TEAM_ACTION_BUTTON, 'utf8');
    const settings = await readFile(TEAM_SETTINGS, 'utf8');

    expect(button).toContain('window.confirm(message)');
    expect(button).toContain('event.preventDefault()');
    expect(settings).toContain('<StepUpMfaDialog');
    expect(settings).toContain('STEP_UP_TOKEN_HEADER');
    expect(settings).toContain('if (!operation || !canManageTeam) return;');
    expect(settings).toContain('operation.reject(');
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
