import { z } from 'zod';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { buildAndPersistQualifiedReviewFinalCloseout } from '@/server/queries/qualified-review-final-closeout';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const schema = z.object({ campaignId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const rate = await checkDistributedRateLimit({ key: `qualified-review-final-closeout:${organization.id}:${user.id}`, limit: 5, windowMs: 60_000 });
    if (!rate.allowed) return noStoreJson({ error: rate.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' }, { status: rate.reason ? 503 : 429 });
    const body = await parseJsonBodyWithZod(request, { schema, maxBytes: 8 * 1024 });
    const result = await buildAndPersistQualifiedReviewFinalCloseout({ organizationId: organization.id, campaignId: body.campaignId, actorUserId: user.id });
    return noStoreJson(result, { status: 201 });
  } catch (error) {
    return secureApiError(error);
  }
}
