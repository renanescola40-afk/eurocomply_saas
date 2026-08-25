import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import {
  isFriaAssignmentRoleEligible,
  validateFriaAssignmentDistinctness,
} from '@/server/ai-governance/fria-assignees';
import { normalizeOrganizationRole, roleHasPermission } from '@/lib/security/permissions';

const DIRECTORY_ROUTE = new URL(
  '../../src/app/api/ai-governance/fria/assignees/route.ts',
  import.meta.url,
);
const FRIA_ROUTE = new URL('../../src/app/api/ai-governance/fria/route.ts', import.meta.url);
const DIRECTORY_SERVICE = new URL(
  '../../src/server/ai-governance/fria-assignees.ts',
  import.meta.url,
);

describe('FRIA assignment roles', () => {
  it('canonicalizes compliance manager aliases onto the existing editor role', () => {
    for (const role of ['compliance-manager', 'compliance_manager', 'compliance manager']) {
      expect(normalizeOrganizationRole(role)).toBe('editor');
      expect(roleHasPermission(role, 'manage_ai_governance')).toBe(true);
      expect(isFriaAssignmentRoleEligible(role)).toBe(true);
    }
  });

  it('allows governance managers and rejects read-only/member roles as assignees', () => {
    expect(isFriaAssignmentRoleEligible('owner')).toBe(true);
    expect(isFriaAssignmentRoleEligible('admin')).toBe(true);
    expect(isFriaAssignmentRoleEligible('editor')).toBe(true);
    expect(isFriaAssignmentRoleEligible('member')).toBe(false);
    expect(isFriaAssignmentRoleEligible('viewer')).toBe(false);
  });

  it('preserves independent reviewer/approver/legal-reviewer separation', () => {
    const ownerId = '00000000-0000-4000-8000-000000000001';
    const reviewerId = '00000000-0000-4000-8000-000000000002';
    const approverId = '00000000-0000-4000-8000-000000000003';
    const legalReviewerId = '00000000-0000-4000-8000-000000000004';

    expect(validateFriaAssignmentDistinctness({
      ownerId,
      reviewerId,
      approverId,
      legalReviewerId,
    })).toEqual({ ok: true });

    expect(validateFriaAssignmentDistinctness({ ownerId, reviewerId: ownerId }))
      .toEqual({ ok: false, error: 'fria_assignment_separation_required', field: 'reviewer' });
    expect(validateFriaAssignmentDistinctness({ ownerId, approverId: ownerId }))
      .toEqual({ ok: false, error: 'fria_assignment_separation_required', field: 'approver' });
    expect(validateFriaAssignmentDistinctness({ ownerId, reviewerId, approverId: reviewerId }))
      .toEqual({ ok: false, error: 'fria_assignment_separation_required', field: 'approver' });
    expect(validateFriaAssignmentDistinctness({ ownerId, legalReviewerId: ownerId }))
      .toEqual({ ok: false, error: 'fria_assignment_separation_required', field: 'legalReviewer' });
  });
});

describe('FRIA assignment directory security contract', () => {
  it('derives tenant scope from the authenticated organization and requires manage permission', async () => {
    const source = await readFile(DIRECTORY_ROUTE, 'utf8');

    expect(source).toContain('await requireApiUser()');
    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain("permission: 'manage_ai_governance'");
    expect(source).toContain('getFriaAssessment(organization.id, assessmentId.data)');
    expect(source).toContain('organizationId: organization.id');
    expect(source).not.toContain("searchParams.get('organization_id')");
    expect(source).not.toContain("searchParams.get('organizationId')");
    expect(source).toContain('noStoreJson');
  });

  it('enumerates only current-tenant active memberships and never globally lists auth users', async () => {
    const source = await readFile(DIRECTORY_SERVICE, 'utf8');

    expect(source).toContain(".from('organization_members')");
    expect(source).toContain(".eq('organization_id', organizationId)");
    expect(source).toContain(".eq('status', 'active')");
    expect(source).toContain('listAssignableMembershipRows(input.organizationId)');
    expect(source).toContain(".not('user_id', 'is', null)");
    expect(source).toContain("supabase.auth.admin.getUserById(userId)");
    expect(source).not.toContain('auth.admin.listUsers');
    expect(source).not.toContain('clerk_user_id');
    expect(source).not.toContain('clerk_membership_id');
  });

  it('validates submitted assignees before FRIA persistence', async () => {
    const source = await readFile(FRIA_ROUTE, 'utf8');
    const validation = source.indexOf('await validateFriaAssignmentMembers({');
    const persistence = source.indexOf('const updated = await updateFriaAssessment(');

    expect(validation).toBeGreaterThan(-1);
    expect(persistence).toBeGreaterThan(validation);
    expect(source).toContain('ownerId: before.owner_id');
    expect(source).toContain("assignmentValidation.error === 'fria_assignee_not_eligible'");
  });
});
