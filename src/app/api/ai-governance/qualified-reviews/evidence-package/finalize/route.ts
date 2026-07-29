import { z } from 'zod';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyQualifiedReviewEvidencePackage } from '@/server/ai-governance/qualified-review-evidence-package';
import { getQualifiedReviewEvidencePackage } from '@/server/queries/qualified-review-evidence-package';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const schema = z.object({ campaignId: z.string().uuid() });
function denied(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return noStoreJson({ error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter }, { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } });
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `qualified-review-evidence-finalize:${organization.id}:${user.id}`, limit: 6, windowMs: 60_000 });
    if (!limit.allowed) return denied(limit);
    const body = await parseJsonBodyWithZod(request, { schema, maxBytes: 8 * 1024 });
    const pkg = await getQualifiedReviewEvidencePackage({ organizationId: organization.id, campaignId: body.campaignId });
    const verification = verifyQualifiedReviewEvidencePackage(pkg);
    if (!verification.validDigest || !verification.validSha || !verification.validItems || !verification.complete) {
      return noStoreJson({ error: 'evidence_package_incomplete', verification, blockers: pkg.blockers }, { status: 409 });
    }
    const db = createAdminClient();
    const { data, error } = await db.rpc('persist_qualified_review_evidence_package', {
      p_organization_id: organization.id,
      p_campaign_id: pkg.campaignId,
      p_target_sha: pkg.targetSha,
      p_manifest_sha256: pkg.manifestSha256,
      p_accepted_points: pkg.acceptedPoints,
      p_review_count: pkg.items.length,
      p_blockers: pkg.blockers,
      p_package: pkg,
      p_generated_by: user.id,
    });
    if (error) throw new Error('qualified_review_evidence_persist_failed');
    return noStoreJson({ packageId: data, manifestSha256: pkg.manifestSha256, status: 'HUMAN_REVIEW_REQUIRED' }, { status: 201 });
  } catch (error) {
    return secureApiError(error);
  }
}
