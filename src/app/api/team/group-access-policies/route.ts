import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  applyGroupAccessPolicy,
  groupAccessPolicyInputSchema,
  previewGroupAccessPolicy,
} from '@/server/enterprise/group-access-admin';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requirePermission,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const MAX_JSON_BYTES = 16 * 1024;

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `group-access-policy:${organization.id}:${user.id}:${getClientIp(request)}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organization.id,
        action: 'group_access_policy_change',
        route: '/api/team/group-access-policies',
        limit: 10,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_team',
      userId: user.id,
      organizationId: organization.id,
    });
    if (!stepUp.ok) return stepUp.response;

    const body = await readBoundedJsonRequest(request, { maxBytes: MAX_JSON_BYTES }).catch(() => null);
    const parsed = groupAccessPolicyInputSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ error: 'invalid_group_access_policy' }, { status: 400 });

    const url = new URL(request.url);
    const previewOnly = url.searchParams.get('preview') === 'true';
    const preview = await previewGroupAccessPolicy({
      organizationId: organization.id,
      policy: parsed.data,
    });

    if (previewOnly) {
      return noStoreJson({
        preview,
        actorRole: permission.role,
        stepUp: publicStepUpSummary(stepUp.assessment),
      });
    }

    if (preview.conflictCount > 0) {
      return noStoreJson({ error: 'group_access_mapping_conflict', preview }, { status: 409 });
    }
    if (preview.wouldRemoveLastAdmin) {
      return noStoreJson({ error: 'last_admin_protection', preview }, { status: 409 });
    }

    const result = await applyGroupAccessPolicy({
      organizationId: organization.id,
      actorUserId: user.id,
      policy: parsed.data,
    });

    if (result.outcome === 'version_conflict') {
      return noStoreJson({ error: 'group_access_policy_version_conflict' }, { status: 409 });
    }
    if (result.outcome === 'mapping_conflict' || result.outcome === 'last_admin_protection') {
      return noStoreJson({ error: result.outcome, preview }, { status: 409 });
    }
    if (result.outcome === 'group_not_found') {
      return noStoreJson({ error: 'group_not_found' }, { status: 404 });
    }
    if (result.outcome !== 'created' && result.outcome !== 'updated') {
      return noStoreJson({ error: 'group_access_policy_apply_failed' }, { status: 400 });
    }

    return noStoreJson({
      result,
      preview,
      actorRole: permission.role,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}