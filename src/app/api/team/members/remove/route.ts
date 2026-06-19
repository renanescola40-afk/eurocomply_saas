import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { checkDistributedRateLimit } from '@/server/security/rate-limit';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const removeMemberSchema = z.object({
  memberId: z.string().trim().min(1).max(128),
});

const RATE_LIMIT_WINDOW_SECONDS = 60;
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
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `team-member-remove:${user.id}:${getClientIp(request)}`,
    limit: RATE_LIMIT_MAX_ATTEMPTS,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson(
      { error: rateLimit.reason ? 'security_control_unavailable' : 'Too many team member removal attempts. Please wait before trying again.' },
      {
        status: rateLimit.reason ? 503 : 429,
        headers: {
          'Retry-After': String(Math.max(1, rateLimit.retryAfterSeconds)),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      },
    );
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_team',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

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
    return noStoreJson({ error: 'self_removal_blocked', message: 'You cannot remove your own access from here.' }, { status: 400 });
  }

  if (member.role === 'owner') {
    const { count, error: ownerCountError } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('role', 'owner');

    if (ownerCountError) {
      return noStoreJson({ error: 'owner_count_failed' }, { status: 503 });
    }

    if ((count ?? 0) <= 1) {
      return noStoreJson({ error: 'last_owner_removal_blocked', message: 'Cannot remove the last organization owner.' }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', parsed.data.memberId)
    .eq('organization_id', organization.id);

  if (error) {
    return noStoreJson({ error: 'team_member_remove_failed' }, { status: 503 });
  }

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'team_member_removed',
    entityType: 'organization_member',
    entityId: parsed.data.memberId,
    metadata: {
      removedUserId: member.user_id,
      role: member.role,
      actorRole: permission.role,
      stepUpAction: 'manage_team',
    },
  });

  return noStoreJson({ removed: true, auditPersisted: audit.persisted, stepUp: publicStepUpSummary(stepUp.assessment) });
}
