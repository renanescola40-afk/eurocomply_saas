import { createAdminClient } from '@/lib/supabase/admin';
import {
  normalizeOrganizationRole,
  roleHasPermission,
  type OrganizationRole,
} from '@/lib/security/permissions';

const MAX_FRIA_ASSIGNEE_CANDIDATES = 250;
const AUTH_LOOKUP_CONCURRENCY = 12;

export type FriaAssignmentKind = 'reviewer' | 'approver' | 'legalReviewer';

export type FriaAssigneeCandidate = {
  userId: string;
  displayName: string;
  email: string | null;
  role: OrganizationRole;
  eligibleFor: FriaAssignmentKind[];
};

type MembershipRow = {
  user_id: string | null;
  role: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

export type FriaAssignmentSelection = {
  ownerId: string;
  reviewerId?: string | null;
  approverId?: string | null;
  legalReviewerId?: string | null;
};

export type FriaAssignmentValidation =
  | { ok: true }
  | {
      ok: false;
      error: 'fria_assignee_not_eligible' | 'fria_assignment_separation_required';
      field: FriaAssignmentKind;
    };

export function isFriaAssignmentRoleEligible(role: string | null | undefined) {
  return roleHasPermission(role, 'manage_ai_governance');
}

export function validateFriaAssignmentDistinctness(
  selection: FriaAssignmentSelection,
): FriaAssignmentValidation {
  if (selection.reviewerId && selection.reviewerId === selection.ownerId) {
    return { ok: false, error: 'fria_assignment_separation_required', field: 'reviewer' };
  }

  if (selection.approverId && selection.approverId === selection.ownerId) {
    return { ok: false, error: 'fria_assignment_separation_required', field: 'approver' };
  }

  if (
    selection.approverId
    && selection.reviewerId
    && selection.approverId === selection.reviewerId
  ) {
    return { ok: false, error: 'fria_assignment_separation_required', field: 'approver' };
  }

  if (selection.legalReviewerId && selection.legalReviewerId === selection.ownerId) {
    return { ok: false, error: 'fria_assignment_separation_required', field: 'legalReviewer' };
  }

  return { ok: true };
}

async function loadProfilesByUserId(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name')
    .in('id', userIds);

  if (error) {
    console.warn('[fria-assignees] profile_lookup_failed', { code: error.code ?? 'unknown' });
    throw new Error('fria_assignee_directory_unavailable');
  }

  return new Map(
    ((data ?? []) as unknown as ProfileRow[])
      .map((profile) => [profile.id, profile.full_name?.trim() ?? ''] as const),
  );
}

async function loadTenantMemberEmails(userIds: string[]) {
  const supabase = createAdminClient();
  const emails = new Map<string, string>();

  for (let offset = 0; offset < userIds.length; offset += AUTH_LOOKUP_CONCURRENCY) {
    const batch = userIds.slice(offset, offset + AUTH_LOOKUP_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (userId) => {
        try {
          const { data, error } = await supabase.auth.admin.getUserById(userId);
          if (error) return [userId, null] as const;
          const email = data.user?.email?.trim().toLowerCase() ?? null;
          return [userId, email] as const;
        } catch {
          return [userId, null] as const;
        }
      }),
    );

    for (const [userId, email] of results) {
      if (email) emails.set(userId, email);
    }
  }

  return emails;
}

export async function listFriaAssigneeCandidates(input: {
  organizationId: string;
  ownerId: string;
}): Promise<FriaAssigneeCandidate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id,role')
    .eq('organization_id', input.organizationId)
    .eq('status', 'active')
    .not('user_id', 'is', null)
    .limit(MAX_FRIA_ASSIGNEE_CANDIDATES);

  if (error) {
    console.warn('[fria-assignees] membership_lookup_failed', { code: error.code ?? 'unknown' });
    throw new Error('fria_assignee_directory_unavailable');
  }

  const eligibleMemberships = ((data ?? []) as unknown as MembershipRow[])
    .filter((membership): membership is MembershipRow & { user_id: string } => {
      return Boolean(
        membership.user_id
        && membership.user_id !== input.ownerId
        && isFriaAssignmentRoleEligible(membership.role),
      );
    });

  const userIds = Array.from(new Set(eligibleMemberships.map((membership) => membership.user_id)));
  const [profiles, emails] = await Promise.all([
    loadProfilesByUserId(userIds),
    loadTenantMemberEmails(userIds),
  ]);

  return eligibleMemberships
    .map((membership) => {
      const role = normalizeOrganizationRole(membership.role);
      const email = emails.get(membership.user_id) ?? null;
      const profileName = profiles.get(membership.user_id)?.trim() ?? '';
      const displayName = profileName || email || `Organization ${role}`;

      return {
        userId: membership.user_id,
        displayName,
        email,
        role,
        eligibleFor: ['reviewer', 'approver', 'legalReviewer'] as FriaAssignmentKind[],
      };
    })
    .sort((left, right) => {
      return left.displayName.localeCompare(right.displayName)
        || left.role.localeCompare(right.role)
        || left.userId.localeCompare(right.userId);
    });
}

export async function validateFriaAssignmentMembers(input: {
  organizationId: string;
  selection: FriaAssignmentSelection;
}): Promise<FriaAssignmentValidation> {
  const separation = validateFriaAssignmentDistinctness(input.selection);
  if (!separation.ok) return separation;

  const assignments: Array<[FriaAssignmentKind, string | null | undefined]> = [
    ['reviewer', input.selection.reviewerId],
    ['approver', input.selection.approverId],
    ['legalReviewer', input.selection.legalReviewerId],
  ];
  const assignedIds = Array.from(new Set(
    assignments
      .map(([, userId]) => userId)
      .filter((userId): userId is string => Boolean(userId)),
  ));
  if (assignedIds.length === 0) return { ok: true };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id,role')
    .eq('organization_id', input.organizationId)
    .eq('status', 'active')
    .in('user_id', assignedIds);

  if (error) {
    console.warn('[fria-assignees] assignment_validation_failed', { code: error.code ?? 'unknown' });
    throw new Error('fria_assignee_directory_unavailable');
  }

  const membershipByUser = new Map(
    ((data ?? []) as unknown as MembershipRow[])
      .filter((membership): membership is MembershipRow & { user_id: string } => Boolean(membership.user_id))
      .map((membership) => [membership.user_id, membership] as const),
  );

  for (const [field, userId] of assignments) {
    if (!userId) continue;
    const membership = membershipByUser.get(userId);
    if (!membership || !isFriaAssignmentRoleEligible(membership.role)) {
      return { ok: false, error: 'fria_assignee_not_eligible', field };
    }
  }

  return { ok: true };
}
