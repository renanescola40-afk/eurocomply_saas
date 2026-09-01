import { NextRequest } from 'next/server';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import {
  LEGAL_ASSURANCE_ARTIFACT_MAX_BYTES,
  removeLegalCounselArtifact,
  storeLegalCounselArtifact,
} from '@/server/legal-assurance/artifacts';
import { isLegalAssuranceEnabled } from '@/server/legal-assurance/core';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { getAssignedCounselReview, getCurrentCounselProfile } from '@/server/queries/legal-assurance';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import {
  scanValidatedUploadForMalware,
  shouldBlockUploadForMalwareScan,
  validateUploadSecurityFile,
} from '@/server/security/upload-security';

const MULTIPART_OVERHEAD_BYTES = 256 * 1024;
const MAX_MULTIPART_BYTES = LEGAL_ASSURANCE_ARTIFACT_MAX_BYTES + MULTIPART_OVERHEAD_BYTES;

type RouteContext = { params: Promise<{ reviewId: string }> };

function disabled() {
  return noStoreJson({ error: 'legal_assurance_unavailable' }, { status: 404 });
}

function parseContentLength(request: Request) {
  const raw = request.headers.get('content-length');
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function scanBlockedStatus(status: string) {
  return status === 'not_configured' || status === 'unavailable' ? 503 : 422;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isLegalAssuranceEnabled()) return disabled();

    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const declaredLength = parseContentLength(request);
    if (declaredLength !== null && declaredLength > MAX_MULTIPART_BYTES) {
      return noStoreJson({ error: 'legal_artifact_too_large' }, { status: 413 });
    }

    const { reviewId } = await context.params;
    const user = await requireApiUser();
    const profile = await getCurrentCounselProfile(user.id);
    if (!profile || !profile.active || profile.verification_status !== 'VERIFIED') {
      return noStoreJson({ error: 'verified_counsel_required' }, { status: 403 });
    }

    const review = await getAssignedCounselReview(profile.id, reviewId);
    if (!review) return noStoreJson({ error: 'counsel_not_authorized' }, { status: 403 });
    if (review.status !== 'IN_REVIEW') {
      return noStoreJson({ error: 'invalid_state', status: review.status }, { status: 409 });
    }

    const rateLimit = await checkDistributedRateLimit({
      key: `legal-assurance:artifact-upload:${profile.id}:${review.id}`,
      limit: 5,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return noStoreJson(
        { error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' },
        { status: rateLimit.reason ? 503 : 429 },
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return noStoreJson({ error: 'invalid_upload_request' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) return noStoreJson({ error: 'file_required' }, { status: 400 });
    if (file.size < 1 || file.size > LEGAL_ASSURANCE_ARTIFACT_MAX_BYTES) {
      return noStoreJson({ error: 'legal_artifact_too_large' }, { status: 413 });
    }

    const validation = await validateUploadSecurityFile(file, { maxBytes: LEGAL_ASSURANCE_ARTIFACT_MAX_BYTES });
    if (!validation.ok || validation.mimeDetected !== 'application/pdf') {
      return noStoreJson({ error: validation.ok ? 'pdf_required' : validation.reason }, { status: 415 });
    }

    const scan = await scanValidatedUploadForMalware({
      validation,
      organizationId: review.organization_id,
    });
    if (shouldBlockUploadForMalwareScan(scan)) {
      return noStoreJson(
        { error: 'legal_artifact_scan_not_clean', scanStatus: scan.status },
        { status: scanBlockedStatus(scan.status) },
      );
    }

    const requestContext = buildAuditRequestContextFromRequest(request);
    const intentAudit = await createAuditEvent({
      organizationId: review.organization_id,
      actorUserId: user.id,
      action: 'COUNSEL_SIGNED_ARTIFACT_UPLOAD_INTENT',
      entityType: 'legal_review_request',
      entityId: review.id,
      metadata: {
        counselProfileId: profile.id,
        lawFirmId: profile.law_firm_id,
        digest: validation.fileHash,
        sizeBytes: validation.fileSize,
        mimeType: validation.mimeDetected,
        scanStatus: scan.status,
        scanProvider: scan.provider,
      },
      requestContext,
    });
    if (!intentAudit.persisted) return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });

    const artifact = await storeLegalCounselArtifact({
      organizationId: review.organization_id,
      reviewId: review.id,
      counselProfileId: profile.id,
      issuer: profile.professional_name,
      originalFilename: validation.fileNameSanitized,
      buffer: validation.buffer,
      digest: validation.fileHash,
    });

    const audit = await createAuditEvent({
      organizationId: review.organization_id,
      actorUserId: user.id,
      action: 'COUNSEL_SIGNED_ARTIFACT_UPLOADED',
      entityType: 'legal_review_artifact',
      entityId: artifact.id,
      metadata: {
        reviewId: review.id,
        counselProfileId: profile.id,
        lawFirmId: profile.law_firm_id,
        artifactReference: artifact.artifact_reference,
        digest: artifact.artifact_digest,
        sizeBytes: artifact.size_bytes,
        mimeType: artifact.mime_type,
      },
      requestContext,
    });

    if (!audit.persisted) {
      const compensated = await removeLegalCounselArtifact(artifact);
      if (!compensated) console.warn('[legal-assurance] artifact_audit_compensation_failed', { artifactId: artifact.id });
      return noStoreJson({ error: 'legal_assurance_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      artifact: {
        id: artifact.id,
        reviewId: artifact.review_id,
        artifactReference: artifact.artifact_reference,
        artifactDigest: artifact.artifact_digest,
        artifactType: artifact.artifact_type,
        issuer: artifact.issuer,
        issuedAt: artifact.issued_at,
        filename: artifact.original_filename,
        sizeBytes: artifact.size_bytes,
        mimeType: artifact.mime_type,
      },
    }, { status: 201 });
  } catch (error) {
    return secureApiError(error);
  }
}
