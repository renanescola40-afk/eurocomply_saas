import { z } from 'zod';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { getQualifiedReviewEvidencePackage } from '@/server/queries/qualified-review-evidence-package';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const querySchema = z.object({ campaignId: z.string().uuid() });

function denied(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return noStoreJson(
    { error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter },
    { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_governance',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    const limit = await checkDistributedRateLimit({
      key: `qualified-review-evidence-package:${organization.id}:${user.id}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.allowed) return denied(limit);

    const parsed = querySchema.safeParse({ campaignId: new URL(request.url).searchParams.get('campaignId') });
    if (!parsed.success) return noStoreJson({ error: 'campaign_id_invalid' }, { status: 400 });

    const evidencePackage = await getQualifiedReviewEvidencePackage({
      organizationId: organization.id,
      campaignId: parsed.data.campaignId,
    });
    return noStoreJson({ evidencePackage, humanReviewRequired: true });
  } catch (error) {
    return secureApiError(error);
  }
}
