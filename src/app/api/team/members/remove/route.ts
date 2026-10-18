import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { removeMemberWithChainedAuditAtomic } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const removeMemberSchema = z.object({
  memberId: z.string().trim().uuid(),
});

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const TEAM_ACTION_JSON_MAX_BYTES = 4 * 1024;

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `team-member-remove:${user.id}:${getClientIp(request)}`,
        policy: 'team-management',
        userId: user.id,
        action: 'team_member_remove',
        route: '/api/team/members/remove',
        limit: RATE_LIMIT_MAX_ATTEMPTS,
        windowMs: RATE_LIMIT_WINDOW_MS,
        failureMode: 'fail-closed',
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
    const parsed = removeMemberSchema.safeParse(payload);

    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_team_member_payload' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id,user_id,role,organization_id')
      .eq('id', parsed.data.memberId)
      .eq('organization_id', organization.id)
      .maybeSingle();

    if (memberError) {
      return noStoreJson({ error: 'team_member_lookup_failed' }, { status: 503 });
    }

    if (!member) {
      return noStoreJson({ error: 'team_member_not_found' }, { status: 404 });
    }

    if (member.user_id === user.id) {
      return noStoreJson(
        { error: 'self_removal_blocked', message: 'You cannot remove your own access from here.' },
        { status: 400 },
      );
    }

    if (!member.user_id) {
      return noStoreJson({ error: 'clerk_only_removal_requires_review' }, { status: 409 });
    }
    if (String(member.role ?? '').toLowerCase() === 'owner' && permission.role !== 'owner') {
      return noStoreJson({ error: 'owner_removal_requires_owner' }, { status: 403 });
    }

    const { row: removal, error: removalError } = await removeMemberWithChainedAuditAtomic({
      organizationId: organization.id,
      memberId: parsed.data.memberId,
      expectedUserId: member.user_id,
      expectedRole: member.role,
      actorUserId: user.id,
      metadata: {
        removedUserId: member.user_id,
        role: member.role,
        actorRole: permission.role,
        stepUpAction: 'manage_team',
      },
    });
    if (removalError || !removal) {
      return noStoreJson({ error: 'team_member_atomic_audit_unavailable' }, { status: 503 });
    }
    if (removal.outcome === 'permission_denied') {
      return noStoreJson({ error: 'team_member_removal_forbidden' }, { status: 403 });
    }
    if (removal.outcome === 'not_found') {
      return noStoreJson({ error: 'team_member_not_found' }, { status: 404 });
    }

    if (removal.outcome === 'last_owner') {
      return noStoreJson(
        { error: 'last_owner_removal_blocked', message: 'Cannot remove the last organization owner.' },
        { status: 400 },
      );
    }

    if (removal.outcome === 'state_changed') {
      return noStoreJson({ error: 'team_member_state_changed' }, { status: 409 });
    }

    if (removal.outcome === 'invalid_input') {
      return noStoreJson({ error: 'invalid_team_member_payload' }, { status: 400 });
    }

    if (removal.outcome !== 'removed') {
      return noStoreJson({ error: 'team_member_removal_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      removed: true,
      auditPersisted: true,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}
