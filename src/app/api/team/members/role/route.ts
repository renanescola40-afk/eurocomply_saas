import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const roleChangeSchema = z.object({
  memberId: z.string().trim().min(1).max(128),
  role: z.enum(['owner', 'admin', 'editor', 'member', 'viewer']),
});

type OrganizationMemberRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
};

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
      return noStoreJson({ error: 'self_role_change_blocked', message: 'You cannot change your own organization role from here.' }, { status: 400 });
    }

    const previousRole = String(member.role ?? 'viewer').toLowerCase();
    const nextRole = parsed.data.role;

    if (previousRole === nextRole) {
      return noStoreJson({ changed: false, role: nextRole, stepUp: publicStepUpSummary(stepUp.assessment) });
    }

    if ((previousRole === 'owner' || nextRole === 'owner') && permission.role !== 'owner') {
      return noStoreJson({ error: 'owner_role_change_requires_owner', message: 'Only organization owners can grant or remove owner access.' }, { status: 403 });
    }

    if (previousRole === 'owner' && nextRole !== 'owner') {
      const { count, error: ownerCountError } = await supabase
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('role', 'owner');

      if (ownerCountError) {
        return noStoreJson({ error: 'owner_count_failed' }, { status: 503 });
      }

      if ((count ?? 0) <= 1) {
        return noStoreJson({ error: 'last_owner_role_change_blocked', message: 'Cannot demote the last organization owner.' }, { status: 400 });
      }
    }

    let roleUpdate = supabase
      .from('organization_members')
      .update({ role: nextRole })
      .eq('id', parsed.data.memberId)
      .eq('organization_id', organization.id);

    roleUpdate = member.role === null
      ? roleUpdate.is('role', null)
      : roleUpdate.eq('role', member.role);

    const { data: updatedMember, error } = await roleUpdate
      .select('id')
      .maybeSingle();

    if (error) {
      return noStoreJson({ error: 'team_role_change_failed' }, { status: 503 });
    }

    if (!updatedMember) {
      return noStoreJson({ error: 'team_member_state_changed' }, { status: 409 });
    }

    const audit = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'team_member_role_changed',
      entityType: 'organization_member',
      entityId: parsed.data.memberId,
      metadata: {
        changedUserId: member.user_id,
        previousRole,
        nextRole,
        actorRole: permission.role,
        stepUpAction: 'manage_team',
      },
    });

    return noStoreJson({ changed: true, role: nextRole, auditPersisted: audit.persisted, stepUp: publicStepUpSummary(stepUp.assessment) });
  } catch (error) {
    return secureApiError(error);
  }
}
