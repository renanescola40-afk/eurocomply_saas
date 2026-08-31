import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { buildLegalReviewPackage } from '@/server/legal-assurance/package-builder';
import { isLegalAssuranceEnabled } from '@/server/legal-assurance/core';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import {
  getLegalReviewForOrganization,
} from '@/server/queries/legal-assurance';
import {
  createLegalReviewPackageAtomic,
  getLatestFinalizedLegalReviewPackage,
  getLegalReviewMatterData,
  respondLegalReviewInformationAtomic,
  resubmitLegalReviewAtomic,
  updateLegalReviewRemediationAtomic,
} from '@/server/queries/legal-assurance-review';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('PREPARE_PACKAGE'),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  }),
  z.object({
    action: z.literal('PROVIDE_INFORMATION'),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    informationRequestId: z.string().uuid(),
    response: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal('UPDATE_REMEDIATION'),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    remediationId: z.string().uuid(),
    customerResponse: z.record(z.string(), z.unknown()),
    markReady: z.boolean(),
  }),
  z.object({
    action: z.literal('RESUBMIT'),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  }),
]);

type RouteContext = { params: Promise<{ reviewId: string }> };

function disabled() {
  return noStoreJson({ error: 'legal_assurance_unavailable' }, { status: 404 });
}

function outcomeResponse(outcome: string, payload: Record<string, unknown> = {}) {
  if (outcome === 'not_found') return noStoreJson({ error: 'legal_review_not_found' }, { status: 404 });
  if (outcome === 'state_changed' || outcome === 'invalid_state') {
    return noStoreJson({ error: outcome, ...payload }, { status: 409 });
  }
  if (['invalid_input', 'information_request_not_open', 'remediation_not_editable', 'remediation_incomplete', 'remediation_required', 'engagement_required', 'items_required', 'invalid_item', 'duplicate_item'].includes(outcome)) {
    return noStoreJson({ error: outcome, ...payload }, { status: 400 });
  }
  return noStoreJson({ error: 'legal_assurance_operation_rejected', outcome, ...payload }, { status: 409 });
}

async function authority(userId: string, permission: 'read_ai_governance' | 'manage_ai_governance') {
  const organization = await getCurrentOrganizationForUser(userId);
  if (!organization) return { response: noStoreJson({ error: 'organization_required' }, { status: 403 }) } as const;

  const result = await assertOrganizationPermission({
    userId,
    organizationId: organization.id,
    permission,
    minimumPlan: 'enterprise',
  });
  if (!result.ok) return { response: permissionDeniedResponse(result) } as const;
  return { organization, permission: result } as const;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isLegalAssuranceEnabled()) return disabled();
    const { reviewId } = await context.params;
    const user = await requireApiUser();
    const auth = await authority(user.id, 'read_ai_governance');
    if ('response' in auth) return auth.response;

    const review = await getLegalReviewForOrganization(auth.organization.id, reviewId);
    if (!review) return noStoreJson({ error: 'legal_review_not_found' }, { status: 404 });

    return noStoreJson({
      review,
      matter: await getLegalReviewMatterData(review.id),
      externalValidation: 'PENDING',
    });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isLegalAssuranceEnabled()) return disabled();

    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const { reviewId } = await context.params;
    const user = await requireApiUser();
    const auth = await authority(user.id, 'manage_ai_governance');
    if ('response' in auth) return auth.response;

    const body = await parseJsonBodyWithZod(request, { schema: actionSchema, maxBytes: MAX_BYTES });
    const review = await getLegalReviewForOrganization(auth.organization.id, reviewId);
    if (!review) return noStoreJson({ error: 'legal_review_not_found' }, { status: 404 });
    if (review.updated_at !== body.expectedUpdatedAt) {
      return noStoreJson({ error: 'state_changed', status: review.status, updatedAt: review.updated_at }, { status: 409 });
    }

    const rateLimit = await checkDistributedRateLimit({
      key: `legal-assurance:customer-matter:${auth.organization.id}:${review.id}:${user.id}`,
      limit: 12,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return noStoreJson(
        { error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' },
        { status: rateLimit.reason ? 503 : 429 },
      );
    }

    const requestContext = buildAuditRequestContextFromRequest(request);

    if (body.action === 'PREPARE_PACKAGE') {
      const previousPackage = await getLatestFinalizedLegalReviewPackage(review.id);
      const built = await buildLegalReviewPackage({
        review,
        nextPackageVersion: (previousPackage?.package_version ?? 0) + 1,
      });
      const result = await createLegalReviewPackageAtomic({
        reviewId: review.id,
        expectedUpdatedAt: body.expectedUpdatedAt,
        productReleaseSha: built.config.productReleaseSha,
        methodologyVersion: built.config.methodologyVersion,
        regulatoryRulesVersion: built.config.regulatoryRulesVersion,
        manifest: built.manifest,
        packageManifestDigest: built.manifestDigest,
        items: built.items,
        createdBy: user.id,
      });
      if (result.outcome !== 'created') return outcomeResponse(result.outcome, { status: result.review_status });

      const createdAudit = await createAuditEvent({
        organizationId: auth.organization.id,
        actorUserId: user.id,
        action: 'REVIEW_PACKAGE_CREATED',
        entityType: 'legal_review_package',
        entityId: String(result.package_id),
        metadata: {
          reviewId: review.id,
          packageVersion: result.package_version,
          manifestDigest: built.manifestDigest,
          productReleaseSha: built.config.productReleaseSha,
        },
        requestContext,
      });
      const frozenAudit = createdAudit.persisted ? await createAuditEvent({
        organizationId: auth.organization.id,
        actorUserId: user.id,
        action: 'REVIEW_PACKAGE_FROZEN',
        entityType: 'legal_review_package',
        entityId: String(result.package_id),
        metadata: {
          reviewId: review.id,
          packageVersion: result.package_version,
          manifestDigest: built.manifestDigest,
        },
        requestContext,
      }) : { persisted: false };

      if (!createdAudit.persisted || !frozenAudit.persisted) {
        console.warn('[legal-assurance] package_audit_incomplete', {
          reviewId: review.id,
          packageId: result.package_id,
          packageVersion: result.package_version,
        });
        return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
      }

      return noStoreJson({ result, manifestDigest: built.manifestDigest }, { status: 201 });
    }

    if (body.action === 'PROVIDE_INFORMATION') {
      const result = await respondLegalReviewInformationAtomic({
        reviewId: review.id,
        expectedUpdatedAt: body.expectedUpdatedAt,
        informationRequestId: body.informationRequestId,
        organizationId: auth.organization.id,
        response: body.response,
        submittedBy: user.id,
      });
      if (result.outcome !== 'answered') return outcomeResponse(result.outcome, { status: result.review_status });

      const audit = await createAuditEvent({
        organizationId: auth.organization.id,
        actorUserId: user.id,
        action: 'INFORMATION_PROVIDED',
        entityType: 'legal_review_request',
        entityId: review.id,
        metadata: { informationRequestId: body.informationRequestId },
        requestContext,
      });
      if (!audit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
      return noStoreJson({ result });
    }

    if (body.action === 'UPDATE_REMEDIATION') {
      const result = await updateLegalReviewRemediationAtomic({
        reviewId: review.id,
        organizationId: auth.organization.id,
        remediationId: body.remediationId,
        expectedReviewUpdatedAt: body.expectedUpdatedAt,
        customerResponse: body.customerResponse,
        markReady: body.markReady,
      });
      if (result.outcome !== 'updated') return outcomeResponse(result.outcome);

      const audit = await createAuditEvent({
        organizationId: auth.organization.id,
        actorUserId: user.id,
        action: 'REMEDIATION_UPDATED',
        entityType: 'legal_review_remediation',
        entityId: body.remediationId,
        metadata: { reviewId: review.id, remediationStatus: result.remediation_status },
        requestContext,
      });
      if (!audit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
      return noStoreJson({ result });
    }

    const result = await resubmitLegalReviewAtomic({
      reviewId: review.id,
      organizationId: auth.organization.id,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    if (result.outcome !== 'resubmitted') return outcomeResponse(result.outcome, { status: result.review_status });

    const audit = await createAuditEvent({
      organizationId: auth.organization.id,
      actorUserId: user.id,
      action: 'REVIEW_RESUBMITTED',
      entityType: 'legal_review_request',
      entityId: review.id,
      metadata: {},
      requestContext,
    });
    if (!audit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
    return noStoreJson({ result });
  } catch (error) {
    return secureApiError(error);
  }
}
