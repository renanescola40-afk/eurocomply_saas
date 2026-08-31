import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { getAiSystem } from '@/server/queries/ai-systems';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import {
  createLegalReviewRequest,
  listLegalReviewsForOrganization,
  rollbackLegalReviewRequest,
} from '@/server/queries/legal-assurance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { isLegalAssuranceEnabled } from '@/server/legal-assurance/core';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 64 * 1024;
const requestSchema = z.object({
  aiSystemId: z.string().uuid().nullable().optional(),
  reviewType: z.string().trim().min(2).max(120),
  jurisdiction: z.string().trim().min(2).max(120),
  scope: z.record(z.string(), z.unknown()).default({}),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

function disabled() {
  return noStoreJson({ error: 'legal_assurance_unavailable' }, { status: 404 });
}

export async function GET() {
  try {
    if (!isLegalAssuranceEnabled()) return disabled();

    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_governance',
      minimumPlan: 'enterprise',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    return noStoreJson({
      reviews: await listLegalReviewsForOrganization(organization.id),
      role: permission.role,
      externalValidation: 'PENDING',
    });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!isLegalAssuranceEnabled()) return disabled();

    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_ai_governance',
      minimumPlan: 'enterprise',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    const rateLimit = await checkDistributedRateLimit({
      key: `legal-assurance:request:${organization.id}:${user.id}`,
      limit: 5,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return noStoreJson(
        { error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' },
        { status: rateLimit.reason ? 503 : 429 },
      );
    }

    const body = await parseJsonBodyWithZod(request, { schema: requestSchema, maxBytes: MAX_BYTES });
    if (body.aiSystemId && !await getAiSystem(body.aiSystemId, organization.id)) {
      return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
    }

    const review = await createLegalReviewRequest({
      organizationId: organization.id,
      requestedBy: user.id,
      aiSystemId: body.aiSystemId,
      reviewType: body.reviewType,
      jurisdiction: body.jurisdiction,
      scope: body.scope,
      priority: body.priority,
    });

    const event = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'LEGAL_REVIEW_REQUESTED',
      entityType: 'legal_review_request',
      entityId: review.id,
      metadata: {
        actorRole: permission.role,
        reviewType: review.review_type,
        jurisdiction: review.jurisdiction,
        priority: review.priority,
        aiSystemId: review.ai_system_id,
        externalValidation: 'PENDING',
      },
      requestContext: buildAuditRequestContextFromRequest(request),
    });

    if (!event.persisted) {
      const rolledBack = await rollbackLegalReviewRequest(organization.id, review.id);
      if (!rolledBack) {
        console.warn('[legal-assurance] create_audit_compensation_failed', { reviewId: review.id });
      }
      return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({ review }, { status: 201 });
  } catch (error) {
    return secureApiError(error);
  }
}
