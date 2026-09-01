import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import {
  createLegalArtifactSignedDownload,
  getLegalArtifactForDownload,
} from '@/server/legal-assurance/artifacts';
import { isLegalAssuranceEnabled } from '@/server/legal-assurance/core';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import {
  getAssignedCounselReview,
  getCurrentCounselProfile,
  getLegalReviewForOrganization,
} from '@/server/queries/legal-assurance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission } from '@/server/security/rbac';

type RouteContext = { params: Promise<{ artifactId: string }> };

type ArtifactAuthority = {
  organizationId: string;
  principalKind: 'CUSTOMER' | 'COUNSEL';
  principalId: string;
};

async function resolveArtifactAuthority(userId: string, reviewId: string): Promise<ArtifactAuthority | null> {
  const organization = await getCurrentOrganizationForUser(userId);
  if (organization) {
    const review = await getLegalReviewForOrganization(organization.id, reviewId);
    if (review) {
      const permission = await assertOrganizationPermission({
        userId,
        organizationId: organization.id,
        permission: 'read_ai_governance',
        minimumPlan: 'enterprise',
      });
      if (permission.ok) {
        return { organizationId: organization.id, principalKind: 'CUSTOMER', principalId: userId };
      }
    }
  }

  const profile = await getCurrentCounselProfile(userId);
  if (!profile || !profile.active || profile.verification_status !== 'VERIFIED') return null;
  const review = await getAssignedCounselReview(profile.id, reviewId);
  if (!review) return null;

  return {
    organizationId: review.organization_id,
    principalKind: 'COUNSEL',
    principalId: profile.id,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    if (!isLegalAssuranceEnabled()) {
      return noStoreJson({ error: 'legal_assurance_unavailable' }, { status: 404 });
    }

    const { artifactId } = await context.params;
    const user = await requireApiUser();
    const artifact = await getLegalArtifactForDownload(artifactId);
    if (!artifact) return noStoreJson({ error: 'legal_artifact_not_found' }, { status: 404 });

    const authority = await resolveArtifactAuthority(user.id, artifact.review_id);
    if (!authority) return noStoreJson({ error: 'legal_artifact_not_found' }, { status: 404 });

    const rateLimit = await checkDistributedRateLimit({
      key: `legal-assurance:artifact-download:${authority.principalKind}:${authority.principalId}:${artifact.id}`,
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
    const requestedAudit = await createAuditEvent({
      organizationId: authority.organizationId,
      actorUserId: user.id,
      action: 'SIGNED_LEGAL_ARTIFACT_DOWNLOAD_REQUESTED',
      entityType: 'legal_review_artifact',
      entityId: artifact.id,
      metadata: {
        reviewId: artifact.review_id,
        artifactReference: artifact.artifact_reference,
        artifactDigest: artifact.artifact_digest,
        principalKind: authority.principalKind,
      },
      requestContext,
    });
    if (!requestedAudit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });

    const download = await createLegalArtifactSignedDownload(artifact);
    const issuedAudit = await createAuditEvent({
      organizationId: authority.organizationId,
      actorUserId: user.id,
      action: 'SIGNED_LEGAL_ARTIFACT_DOWNLOAD_ISSUED',
      entityType: 'legal_review_artifact',
      entityId: artifact.id,
      metadata: {
        reviewId: artifact.review_id,
        artifactReference: artifact.artifact_reference,
        artifactDigest: artifact.artifact_digest,
        principalKind: authority.principalKind,
        expiresInSeconds: download.expiresInSeconds,
      },
      requestContext,
    });
    if (!issuedAudit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });

    return noStoreJson({
      artifactId: artifact.id,
      filename: download.filename,
      signedUrl: download.signedUrl,
      expiresInSeconds: download.expiresInSeconds,
    });
  } catch (error) {
    return secureApiError(error);
  }
}
