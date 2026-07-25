import { z } from 'zod';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { promoteQualifiedReviewCampaign } from '@/server/queries/qualified-review-promotion';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const schema = z.object({ campaignId: z.string().uuid() });
function denied(result: RateLimitResult) { const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)); return noStoreJson({ error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' }, { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } }); }

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request); if (originDenied) return originDenied;
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `qualified-review:promote:${organization.id}:${user.id}`, limit: 3, windowMs: 60_000 });
    if (!limit.allowed) return denied(limit);
    const body = await parseJsonBodyWithZod(request, { schema, maxBytes: 16 * 1024 });
    const result = await promoteQualifiedReviewCampaign({ organizationId: organization.id, campaignId: body.campaignId, actorUserId: user.id });
    if (result.outcome === 'not_found') return noStoreJson({ error: 'qualified_review_campaign_not_found' }, { status: 404 });
    if (result.outcome === 'not_ready') return noStoreJson({ error: 'qualified_review_campaign_not_ready', closeout: result.closeout }, { status: 409 });
    const audit = await createAuditEvent({ organizationId: organization.id, actorUserId: user.id, action: 'qualified_review_campaign_promoted', entityType: 'qualified_review_campaign', entityId: body.campaignId, metadata: { integritySha256: result.integritySha256, actorRole: permission.role }, requestContext: buildAuditRequestContextFromRequest(request) });
    if (!audit.persisted) return noStoreJson({ error: 'qualified_review_audit_unavailable' }, { status: 503 });
    return noStoreJson({ promotion: result.promotion, manifest: result.manifest });
  } catch (error) { return secureApiError(error); }
}
