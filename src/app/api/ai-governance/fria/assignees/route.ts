import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { listFriaAssigneeCandidates } from '@/server/ai-governance/fria-assignees';
import { getFriaAssessment } from '@/server/queries/fria';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const assessmentIdSchema = z.string().uuid();

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_ai_governance',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    const rateLimit = await checkDistributedRateLimit({
      key: `fria:assignees:${organization.id}:${user.id}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return noStoreJson(
        {
          error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
          retryAfter,
        },
        {
          status: rateLimit.reason ? 503 : 429,
          headers: { 'Retry-After': String(retryAfter) },
        },
      );
    }

    const assessmentId = assessmentIdSchema.safeParse(
      new URL(request.url).searchParams.get('assessment_id'),
    );
    if (!assessmentId.success) {
      return noStoreJson({ error: 'invalid_fria_assessment_id' }, { status: 400 });
    }

    const assessment = await getFriaAssessment(organization.id, assessmentId.data);
    if (!assessment) {
      return noStoreJson({ error: 'fria_assessment_not_found' }, { status: 404 });
    }

    const candidates = await listFriaAssigneeCandidates({
      organizationId: organization.id,
      ownerId: assessment.owner_id,
    });

    return noStoreJson({
      candidates,
      role: permission.role,
      constraints: {
        candidatePermission: 'manage_ai_governance',
        reviewerMustDifferFromOwner: true,
        approverMustDifferFromOwner: true,
        approverMustDifferFromReviewer: true,
        legalReviewerMustDifferFromOwner: true,
      },
    });
  } catch (error) {
    return secureApiError(error, request);
  }
}
