import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { isLegalAssuranceEnabled } from '@/server/legal-assurance/core';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { counselLegalReviewGateAtomic } from '@/server/queries/legal-assurance-counsel';
import {
  getAssignedCounselReview,
  getCurrentCounselProfile,
  listAssignedCounselReviews,
} from '@/server/queries/legal-assurance';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';

const MAX_BYTES = 32 * 1024;
const gateSchema = z.object({
  reviewId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  action: z.enum(['CONFLICT_ACCEPT', 'CONFLICT_DECLINE', 'ENGAGEMENT_ACCEPT', 'ENGAGEMENT_DECLINE']),
  engagementReference: z.string().trim().min(2).max(512).nullable().optional(),
});

function disabled() {
  return noStoreJson({ error: 'legal_assurance_unavailable' }, { status: 404 });
}

function counselDenied() {
  return noStoreJson({ error: 'verified_counsel_required' }, { status: 403 });
}

async function getReviewerSession(userId: string) {
  const profile = await getCurrentCounselProfile(userId);
  if (!profile || !profile.active || profile.verification_status !== 'VERIFIED') return null;
  return { profile };
}

export async function GET() {
  try {
    if (!isLegalAssuranceEnabled()) return disabled();

    const user = await requireApiUser();
    const reviewerSession = await getReviewerSession(user.id);
    if (!reviewerSession) return counselDenied();
    const { profile } = reviewerSession;

    return noStoreJson({
      reviews: await listAssignedCounselReviews(profile.id),
      counsel: {
        id: profile.id,
        lawFirmId: profile.law_firm_id,
        professionalName: profile.professional_name,
        jurisdictions: profile.jurisdictions,
        specialties: profile.specialties,
      },
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
    const reviewerSession = await getReviewerSession(user.id);
    if (!reviewerSession) return counselDenied();
    const { profile } = reviewerSession;

    const body = await parseJsonBodyWithZod(request, { schema: gateSchema, maxBytes: MAX_BYTES });
    if (body.action === 'ENGAGEMENT_ACCEPT' && !body.engagementReference) {
      return noStoreJson({ error: 'engagement_reference_required' }, { status: 400 });
    }

    const review = await getAssignedCounselReview(profile.id, body.reviewId);
    if (!review) return noStoreJson({ error: 'legal_review_not_found' }, { status: 404 });

    const rateLimit = await checkDistributedRateLimit({
      key: `legal-assurance:counsel-gate:${profile.id}:${review.id}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return noStoreJson(
        { error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' },
        { status: rateLimit.reason ? 503 : 429 },
      );
    }

    const result = await counselLegalReviewGateAtomic({
      reviewId: review.id,
      expectedUpdatedAt: body.expectedUpdatedAt,
      counselProfileId: profile.id,
      action: body.action,
      engagementReference: body.engagementReference,
    });

    if (result.outcome === 'state_changed' || result.outcome === 'invalid_state') {
      return noStoreJson({ error: result.outcome, status: result.review_status }, { status: 409 });
    }
    if (result.outcome === 'counsel_not_authorized') return counselDenied();
    if (result.outcome === 'not_found') return noStoreJson({ error: 'legal_review_not_found' }, { status: 404 });
    if (result.outcome === 'engagement_reference_required' || result.outcome === 'invalid_input' || result.outcome === 'unsupported_action') {
      return noStoreJson({ error: result.outcome }, { status: 400 });
    }

    const audit = await createAuditEvent({
      organizationId: review.organization_id,
      actorUserId: user.id,
      action: body.action === 'CONFLICT_ACCEPT'
        ? 'CONFLICT_CHECK_ACCEPTED'
        : body.action === 'CONFLICT_DECLINE'
          ? 'MATTER_DECLINED'
          : body.action === 'ENGAGEMENT_ACCEPT'
            ? 'ENGAGEMENT_ACCEPTED'
            : 'MATTER_DECLINED',
      entityType: 'legal_review_request',
      entityId: review.id,
      metadata: {
        counselProfileId: profile.id,
        lawFirmId: profile.law_firm_id,
        result: result.outcome,
        engagementReferencePresent: Boolean(body.engagementReference),
      },
      requestContext: buildAuditRequestContextFromRequest(request),
    });

    if (!audit.persisted) {
      console.warn('[legal-assurance] counsel_gate_audit_failed', {
        reviewId: review.id,
        counselProfileId: profile.id,
        action: body.action,
      });
      return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({ result });
  } catch (error) {
    return secureApiError(error);
  }
}
