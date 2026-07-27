import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getQualifiedReviewControlCenter } from '@/server/queries/qualified-review-control-center';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

function denied(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return noStoreJson(
    { error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter },
    { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'read_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `qualified-review-control-center:${organization.id}:${user.id}`, limit: 30, windowMs: 60_000 });
    if (!limit.allowed) return denied(limit);
    const controlCenter = await getQualifiedReviewControlCenter(organization.id);
    return noStoreJson({ ...controlCenter, role: permission.role, humanReviewRequired: !controlCenter.readiness.technicallyReady });
  } catch (error) {
    return secureApiError(error);
  }
}
