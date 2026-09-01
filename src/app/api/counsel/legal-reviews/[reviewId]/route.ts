import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import {
  canonicalizeJson,
  isLegalAssuranceEnabled,
  sha256Hex,
} from '@/server/legal-assurance/core';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import {
  getAssignedCounselReview,
  getCurrentCounselProfile,
  transitionLegalReviewAtomic,
} from '@/server/queries/legal-assurance';
import {
  getLatestFinalizedLegalReviewPackage,
  getLegalReviewMatterData,
  issueLegalReviewDecisionAtomic,
  requestLegalReviewInformationAtomic,
} from '@/server/queries/legal-assurance-review';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';

const MAX_BYTES = 128 * 1024;
const remediationItemSchema = z.object({
  stableFindingId: z.string().trim().min(1).max(240),
  title: z.string().trim().min(2).max(240),
  requiredAction: z.string().trim().min(2).max(10_000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});
const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('START_REVIEW'),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  }),
  z.object({
    action: z.literal('REQUEST_INFORMATION'),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    prompt: z.string().trim().min(2).max(10_000),
  }),
  z.object({
    action: z.literal('ISSUE_DECISION'),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    decision: z.enum(['ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REMEDIATION_REQUIRED', 'REJECTED', 'OUTSIDE_SCOPE']),
    scope: z.record(z.string(), z.unknown()),
    jurisdiction: z.string().trim().min(2).max(120),
    rationale: z.string().trim().min(10).max(20_000),
    conditions: z.array(z.unknown()).max(100).default([]),
    exclusions: z.array(z.unknown()).max(100).default([]),
    validUntil: z.string().datetime({ offset: true }).nullable().optional(),
    signedArtifactReference: z.string().trim().min(1).max(2048).nullable().optional(),
    remediationItems: z.array(remediationItemSchema).max(100).default([]),
  }),
]);

type RouteContext = { params: Promise<{ reviewId: string }> };

function disabled() {
  return noStoreJson({ error: 'legal_assurance_unavailable' }, { status: 404 });
}

function counselDenied() {
  return noStoreJson({ error: 'verified_counsel_required' }, { status: 403 });
}

function rejected(outcome: string, status?: string | null) {
  if (outcome === 'not_found') return noStoreJson({ error: 'legal_review_not_found' }, { status: 404 });
  if (outcome === 'counsel_not_authorized') return counselDenied();
  if (outcome === 'state_changed' || outcome === 'invalid_state') return noStoreJson({ error: outcome, status }, { status: 409 });
  if (['invalid_input', 'package_required', 'invalid_validity', 'remediation_items_required'].includes(outcome)) {
    return noStoreJson({ error: outcome, status }, { status: 400 });
  }
  return noStoreJson({ error: 'legal_assurance_operation_rejected', outcome, status }, { status: 409 });
}

async function getReviewerSession(userId: string, reviewId: string) {
  const profile = await getCurrentCounselProfile(userId);
  if (!profile || !profile.active || profile.verification_status !== 'VERIFIED') return null;
  const review = await getAssignedCounselReview(profile.id, reviewId);
  if (!review) return null;
  return { profile, review };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isLegalAssuranceEnabled()) return disabled();
    const { reviewId } = await context.params;
    const user = await requireApiUser();
    const matter = await getReviewerSession(user.id, reviewId);
    if (!matter) return counselDenied();

    return noStoreJson({
      review: matter.review,
      counsel: {
        id: matter.profile.id,
        lawFirmId: matter.profile.law_firm_id,
        professionalName: matter.profile.professional_name,
        jurisdictions: matter.profile.jurisdictions,
        specialties: matter.profile.specialties,
      },
      matter: await getLegalReviewMatterData(matter.review.id),
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
    const matter = await getReviewerSession(user.id, reviewId);
    if (!matter) return counselDenied();

    const body = await parseJsonBodyWithZod(request, { schema: actionSchema, maxBytes: MAX_BYTES });
    if (matter.review.updated_at !== body.expectedUpdatedAt) {
      return noStoreJson({ error: 'state_changed', status: matter.review.status, updatedAt: matter.review.updated_at }, { status: 409 });
    }

    const rateLimit = await checkDistributedRateLimit({
      key: `legal-assurance:counsel-review:${matter.profile.id}:${matter.review.id}`,
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

    if (body.action === 'START_REVIEW') {
      const result = await transitionLegalReviewAtomic({
        reviewId: matter.review.id,
        expectedUpdatedAt: body.expectedUpdatedAt,
        nextStatus: 'IN_REVIEW',
      });
      if (result.outcome !== 'transitioned') return rejected(result.outcome, result.review_status);

      const audit = await createAuditEvent({
        organizationId: matter.review.organization_id,
        actorUserId: user.id,
        action: 'COUNSEL_REVIEW_STARTED',
        entityType: 'legal_review_request',
        entityId: matter.review.id,
        metadata: { counselProfileId: matter.profile.id, lawFirmId: matter.profile.law_firm_id },
        requestContext,
      });
      if (!audit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
      return noStoreJson({ result });
    }

    if (body.action === 'REQUEST_INFORMATION') {
      const result = await requestLegalReviewInformationAtomic({
        reviewId: matter.review.id,
        expectedUpdatedAt: body.expectedUpdatedAt,
        counselProfileId: matter.profile.id,
        prompt: body.prompt,
      });
      if (result.outcome !== 'requested') return rejected(result.outcome, result.review_status);

      const audit = await createAuditEvent({
        organizationId: matter.review.organization_id,
        actorUserId: user.id,
        action: 'INFORMATION_REQUESTED',
        entityType: 'legal_review_request',
        entityId: matter.review.id,
        metadata: {
          counselProfileId: matter.profile.id,
          informationRequestId: result.information_request_id,
        },
        requestContext,
      });
      if (!audit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
      return noStoreJson({ result });
    }

    if (body.decision === 'REMEDIATION_REQUIRED' && body.remediationItems.length === 0) {
      return noStoreJson({ error: 'remediation_items_required' }, { status: 400 });
    }

    const latestPackage = await getLatestFinalizedLegalReviewPackage(matter.review.id);
    if (!latestPackage) return noStoreJson({ error: 'package_required' }, { status: 409 });

    const decisionPayload = {
      schemaVersion: 1,
      reviewId: matter.review.id,
      packageId: latestPackage.id,
      packageVersion: latestPackage.package_version,
      packageManifestDigest: latestPackage.package_manifest_digest,
      lawFirmId: matter.profile.law_firm_id,
      counselProfileId: matter.profile.id,
      decision: body.decision,
      scope: body.scope,
      jurisdiction: body.jurisdiction,
      rationale: body.rationale,
      conditions: body.conditions,
      exclusions: body.exclusions,
      validUntil: body.validUntil ?? null,
      signedArtifactReference: body.signedArtifactReference ?? null,
      remediationItems: body.remediationItems,
    };
    const decisionDigest = sha256Hex(canonicalizeJson(decisionPayload));

    const intentAudit = await createAuditEvent({
      organizationId: matter.review.organization_id,
      actorUserId: user.id,
      action: 'COUNSEL_DECISION_ISSUE_INTENT',
      entityType: 'legal_review_request',
      entityId: matter.review.id,
      metadata: {
        counselProfileId: matter.profile.id,
        lawFirmId: matter.profile.law_firm_id,
        packageId: latestPackage.id,
        packageVersion: latestPackage.package_version,
        decision: body.decision,
        decisionDigest,
      },
      requestContext,
    });
    if (!intentAudit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });

    const result = await issueLegalReviewDecisionAtomic({
      reviewId: matter.review.id,
      expectedUpdatedAt: body.expectedUpdatedAt,
      counselProfileId: matter.profile.id,
      decision: body.decision,
      scope: body.scope,
      jurisdiction: body.jurisdiction,
      rationale: body.rationale,
      conditions: body.conditions,
      exclusions: body.exclusions,
      validUntil: body.validUntil ?? null,
      signedArtifactReference: body.signedArtifactReference ?? null,
      decisionDigest,
      remediationItems: body.remediationItems,
    });
    if (result.outcome !== 'issued') return rejected(result.outcome, result.review_status);

    const audit = await createAuditEvent({
      organizationId: matter.review.organization_id,
      actorUserId: user.id,
      action: body.decision === 'REMEDIATION_REQUIRED' ? 'REMEDIATION_REQUESTED' : 'COUNSEL_DECISION_ISSUED',
      entityType: 'legal_review_decision',
      entityId: String(result.decision_id),
      metadata: {
        reviewId: matter.review.id,
        counselProfileId: matter.profile.id,
        lawFirmId: matter.profile.law_firm_id,
        packageId: latestPackage.id,
        packageVersion: latestPackage.package_version,
        decision: body.decision,
        decisionDigest,
        conditionsCount: body.conditions.length,
        exclusionsCount: body.exclusions.length,
        remediationCount: body.remediationItems.length,
        signedArtifactReferencePresent: Boolean(body.signedArtifactReference),
      },
      requestContext,
    });

    if (!audit.persisted) {
      console.warn('[legal-assurance] professional_decision_audit_incomplete', {
        reviewId: matter.review.id,
        decisionId: result.decision_id,
        decisionDigest,
      });
      return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({ result, decisionDigest });
  } catch (error) {
    return secureApiError(error);
  }
}
