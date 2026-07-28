import { createHash } from 'node:crypto';

export const QUALIFIED_REVIEW_HANDOFF_STATUS = 'HUMAN_REVIEW_REQUIRED' as const;

export type QualifiedReviewEvidenceItem = {
  workstreamId: string;
  weight: number;
  assignmentId: string;
  reviewerId: string;
  submissionId: string;
  decisionId: string;
  targetSha: string;
  integritySha256: string;
  acceptedAt: string;
  validUntil: string;
};

export type QualifiedReviewEvidencePackage = {
  campaignId: string;
  organizationId: string;
  targetSha: string;
  generatedAt: string;
  status: typeof QUALIFIED_REVIEW_HANDOFF_STATUS;
  acceptedPoints: number;
  items: QualifiedReviewEvidenceItem[];
  blockers: string[];
  manifestSha256: string;
};

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildQualifiedReviewEvidencePackage(input: Omit<QualifiedReviewEvidencePackage, 'status' | 'manifestSha256'>): QualifiedReviewEvidencePackage {
  const items = [...input.items].sort((a, b) => a.workstreamId.localeCompare(b.workstreamId));
  const blockers = [...new Set(input.blockers)].sort();
  const payload = {
    ...input,
    items,
    blockers,
    status: QUALIFIED_REVIEW_HANDOFF_STATUS,
  };

  return {
    ...payload,
    manifestSha256: sha256(JSON.stringify(payload)),
  };
}

export function verifyQualifiedReviewEvidencePackage(pkg: QualifiedReviewEvidencePackage) {
  const { manifestSha256, ...payload } = pkg;
  const validDigest = sha256(JSON.stringify(payload)) === manifestSha256;
  const validSha = /^[a-f0-9]{40}$/.test(pkg.targetSha);
  const validItems = pkg.items.every((item) => item.targetSha === pkg.targetSha && /^[a-f0-9]{64}$/.test(item.integritySha256));
  const complete = pkg.items.length === 8 && pkg.acceptedPoints === 51 && pkg.blockers.length === 0;
  return { validDigest, validSha, validItems, complete, humanReviewRequired: true };
}
