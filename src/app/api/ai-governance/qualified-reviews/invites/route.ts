import { z } from 'zod';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { createReviewerInvite } from '@/server/queries/qualified-reviewer-portal';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const schema = z.object({
  assignmentId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  expiresAt: z.string().datetime({ offset: true }),
});
function denied(result: RateLimitResult) { const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)); return noStoreJson({ error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter }, { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } }); }

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request); if (originDenied) return originDenied;
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `qualified-review-invite:${organization.id}:${user.id}`, limit: 10, windowMs: 60_000 });
    if (!limit.allowed) return denied(limit);
    const body = await parseJsonBodyWithZod(request, { schema, maxBytes: 32 * 1024 });
    if (new Date(body.expiresAt) <= new Date()) return noStoreJson({ error: 'invite_expiry_invalid' }, { status: 400 });
    const created = await createReviewerInvite({ organizationId: organization.id, actorUserId: user.id, ...body });
    return noStoreJson({ invite: created.invite, token: created.token }, { status: 201 });
  } catch (error) { return secureApiError(error); }
}
