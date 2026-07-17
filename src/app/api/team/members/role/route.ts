import { z } from 'zod';

import { reportError } from '@/lib/observability/report-error';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const roleChangeSchema = z.object({
  memberId: z.string().trim().uuid(),
  role: z.enum(['owner', 'admin', 'editor', 'member', 'viewer']),
});

type OrganizationMemberRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
};

type TeamRoleTransitionResult = {
  outcome: 'changed' | 'unchanged' | 'last_owner' | 'state_changed' | 'not_found' | 'invalid_input' | 'invalid_role';
  affected_member_id: string | null;
  affected_user_id: string | null;
  previous_role: string | null;
  applied_role: string | null;
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const TEAM_ACTION_JSON_MAX_BYTES = 4 * 1024;
const ATOMIC_ROLE_TRANSITION_RPC = 'change_organization_member_role_atomic';

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function firstTransitionResult(value: unknown): TeamRoleTransitionResult | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  return candidate as TeamRoleTransitionResult;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `team-member-role:${user.id}:${getClientIp(request)}`,
        limit: RATE_LIMIT_MAX_ATTEMPTS,
        windowMs: RATE_LIMIT_WINDOW_MS,
      },
    });

    if (mutationDenied) return mutationDenied;

    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_team',
      userId: user.id,
      organizationId: organization.id,
    });

    if (!stepUp.ok) {
      return stepUp.response;
    }

    const payload = await readBoundedJsonRequest(request, { maxBytes: TEAM_ACTION_JSON_MAX_BYTES }).catch(() => null);
    const parsed = roleChangeSchema.safeParse(payload);

    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_team_role_payload' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('id,user_id,role,organization_id')
      .eq('id', parsed.data.memberId)
      .eq('organization_id', organization.id)
      .maybeSingle();
    const member = memberData as OrganizationMemberRecord | null;

    if (memberError) {
      return noStoreJson({ error: 'team_member_lookup_failed' }, { status: 503 });
    }

    if (!member) {
      return noStoreJson({ error: 'team_member_not_found' }, { status: 404 });
    }

    if (member.user_id === user.id) {
      return noStoreJson(
        { error: 'self_role_change_blocked', message: 'You cannot change your own organization role from here.' },
        { status: 400 },
      );
    }

    const previousRole = String(member.role ?? 'viewer').toLowerCase();
    const nextRole = parsed.data.role;

    if (previousRole === nextRole) {
      return noStoreJson({ changed: false, role: nextRole, stepUp: publicStepUpSummary(stepUp.assessment) });
    }

    if ((previousRole === 'owner' || nextRole === 'owner') && permission.role !== 'owner') {
      return noStoreJson(
        { error: 'owner_role_change_requires_owner', message: 'Only organization owners can grant or remove owner access.' },
        { status: 403 },
      );
    }

    const { data: transitionData, error: transitionError } = await supabase.rpc(ATOMIC_ROLE_TRANSITION_RPC, {
      p_organization_id: organization.id,
      p_member_id: parsed.data.memberId,
      p_expected_role: member.role,
      p_next_role: nextRole,
    });

    if (transitionError) {
      return noStoreJson({ error: 'team_role_change_failed' }, { status: 503 });
    }

    const transition = firstTransitionResult(transitionData);
    if (!transition) {
      return noStoreJson({ error: 'team_role_transition_unavailable' }, { status: 503 });
    }

    if (transition.outcome === 'not_found') {
      return noStoreJson({ error: 'team_member_not_found' }, { status: 404 });
    }

    if (transition.outcome === 'last_owner') {
      return noStoreJson(
        { error: 'last_owner_role_change_blocked', message: 'Cannot demote the last organization owner.' },
        { status: 400 },
      );
    }

    if (transition.outcome === 'state_changed') {
      return noStoreJson({ error: 'team_member_state_changed' }, { status: 409 });
    }

    if (transition.outcome === 'unchanged') {
      return noStoreJson({ changed: false, role: nextRole, stepUp: publicStepUpSummary(stepUp.assessment) });
    }

    if (transition.outcome === 'invalid_input' || transition.outcome === 'invalid_role') {
      return noStoreJson({ error: 'invalid_team_role_payload' }, { status: 400 });
    }

    if (transition.outcome !== 'changed') {
      return noStoreJson({ error: 'team_role_transition_unavailable' }, { status: 503 });
    }

    const appliedRole = transition.applied_role ?? nextRole;
    const audit = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'team_member_role_changed',
      entityType: 'organization_member',
      entityId: transition.affected_member_id ?? parsed.data.memberId,
      metadata: {
        changedUserId: transition.affected_user_id ?? member.user_id,
        previousRole: String(transition.previous_role ?? previousRole).toLowerCase(),
        nextRole: appliedRole,
        actorRole: permission.role,
        stepUpAction: 'manage_team',
      },
    });

    if (!audit.persisted) {
      const { data: rollbackData, error: rollbackError } = await supabase.rpc(ATOMIC_ROLE_TRANSITION_RPC, {
        p_organization_id: organization.id,
        p_member_id: parsed.data.memberId,
        p_expected_role: appliedRole,
        p_next_role: member.role,
      });
      const rollback = firstTransitionResult(rollbackData);

      if (rollbackError || rollback?.outcome !== 'changed') {
        reportError(new Error('Team role audit rollback failed'), {
          area: 'team_role_change_audit_rollback',
          organizationId: organization.id,
          userId: user.id,
          code: rollbackError?.code ?? rollback?.outcome ?? 'unknown',
        });
      }

      return noStoreJson({ error: 'team_role_change_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      changed: true,
      role: appliedRole,
      auditPersisted: true,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}
