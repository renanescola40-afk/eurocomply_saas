import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { getRegulatoryControlTowerSnapshot } from '@/server/queries/regulatory-control-tower';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';

function rateLimitDeniedResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return noStoreJson(
    {
      error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
      retryAfter,
    },
    {
      status: result.reason ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_governance',
      minimumPlan: 'professional',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    const rateLimit = await checkDistributedRateLimit({
      key: `regulatory-control-tower:read:${organization.id}:${user.id}`,
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.allowed) return rateLimitDeniedResponse(rateLimit);

    const snapshot = await getRegulatoryControlTowerSnapshot(organization.id);
    return noStoreJson({ ...snapshot, role: permission.role });
  } catch (error) {
    return secureApiError(error);
  }
}
