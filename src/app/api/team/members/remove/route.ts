import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { removeOrganizationMember } from '@/server/actions/members';
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

  try {
    await removeOrganizationMember({ organizationId: organization.id, memberId: parsed.data.memberId }, user.id);
  } catch {
    return noStoreJson({ error: 'team_member_remove_failed' }, { status: 400 });
  }

  return noStoreJson({ removed: true, stepUp: publicStepUpSummary(stepUp.assessment) });
}
