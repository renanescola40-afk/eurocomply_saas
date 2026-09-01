import { createHash } from 'node:crypto';

export const LEGAL_ASSURANCE_ENV_KEY = 'LEGAL_ASSURANCE_ENABLED' as const;

export const LEGAL_REVIEW_STATUSES = [
  'DRAFT',
  'REQUESTED',
  'CONFLICT_CHECK_PENDING',
  'DECLINED',
  'ENGAGEMENT_PENDING',
  'ACCEPTED_FOR_REVIEW',
  'PACKAGE_PREPARING',
  'READY_FOR_REVIEW',
  'IN_REVIEW',
  'INFORMATION_REQUESTED',
  'REMEDIATION_REQUIRED',
  'RESUBMITTED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'SUPERSEDED',
] as const;

export type LegalReviewStatus = (typeof LEGAL_REVIEW_STATUSES)[number];

export const COUNSEL_DECISIONS = [
  'ACCEPTED',
  'ACCEPTED_WITH_CONDITIONS',
  'REMEDIATION_REQUIRED',
  'REJECTED',
  'OUTSIDE_SCOPE',
] as const;

export type CounselDecision = (typeof COUNSEL_DECISIONS)[number];
export type ReviewRecommendation = 'NO_REVIEW' | 'LIMITED_REVIEW' | 'FULL_REVIEW';
export type DeltaKind = 'ADDED' | 'CHANGED' | 'REMOVED' | 'UNCHANGED';

const TRANSITIONS: Readonly<Record<LegalReviewStatus, readonly LegalReviewStatus[]>> = {
  DRAFT: ['REQUESTED', 'CANCELLED'],
  REQUESTED: ['CONFLICT_CHECK_PENDING', 'CANCELLED'],
  CONFLICT_CHECK_PENDING: ['DECLINED', 'ENGAGEMENT_PENDING', 'CANCELLED'],
  DECLINED: [],
  ENGAGEMENT_PENDING: ['ACCEPTED_FOR_REVIEW', 'DECLINED', 'CANCELLED'],
  ACCEPTED_FOR_REVIEW: ['PACKAGE_PREPARING', 'CANCELLED'],
  PACKAGE_PREPARING: ['READY_FOR_REVIEW', 'CANCELLED'],
  READY_FOR_REVIEW: ['IN_REVIEW', 'CANCELLED', 'EXPIRED'],
  IN_REVIEW: ['INFORMATION_REQUESTED', 'REMEDIATION_REQUIRED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
  INFORMATION_REQUESTED: ['IN_REVIEW', 'CANCELLED', 'EXPIRED'],
  REMEDIATION_REQUIRED: ['RESUBMITTED', 'CANCELLED', 'EXPIRED'],
  RESUBMITTED: ['PACKAGE_PREPARING', 'CANCELLED', 'EXPIRED'],
  COMPLETED: ['EXPIRED', 'SUPERSEDED'],
  CANCELLED: [],
  EXPIRED: [],
  SUPERSEDED: [],
};

type Environment = Record<string, string | undefined>;

type JsonPrimitive = null | boolean | number | string;
export type CanonicalJson = JsonPrimitive | CanonicalJson[] | { [key: string]: CanonicalJson };

export type LegalReviewPackageManifest = {
  reviewId: string;
  organizationId: string;
  aiSystemId: string | null;
  productReleaseSha: string;
  methodologyVersion: string;
  regulatoryRulesVersion: string;
  packageVersion: number;
  createdAt: string;
  items: Array<{
    stableIdentifier: string;
    contentDigest: string;
    sourceVersion: string;
    capturedAt: string;
  }>;
  knownLimitations: string[];
  openGaps: string[];
};

export type PackageItemFingerprint = {
  stableIdentifier: string;
  contentDigest: string;
};

export type PackageDelta = PackageItemFingerprint & {
  kind: DeltaKind;
  previousDigest: string | null;
};

export function isLegalAssuranceEnabled(env: Environment = process.env): boolean {
  return env[LEGAL_ASSURANCE_ENV_KEY]?.trim().toLowerCase() === 'true';
}

export function requireLegalAssuranceEnabled(env: Environment = process.env): void {
  if (!isLegalAssuranceEnabled(env)) {
    throw new Error('legal_assurance_disabled');
  }
}

export function canTransitionLegalReview(from: LegalReviewStatus, to: LegalReviewStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertLegalReviewTransition(from: LegalReviewStatus, to: LegalReviewStatus): void {
  if (!canTransitionLegalReview(from, to)) {
    throw new Error(`legal_review_invalid_transition:${from}:${to}`);
  }
}

function canonicalizeValue(value: unknown, path: string): CanonicalJson {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`legal_assurance_non_finite_number:${path}`);
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalizeValue(item, `${path}[${index}]`));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, CanonicalJson> = {};
    for (const key of Object.keys(input).sort()) {
      const candidate = input[key];
      if (candidate === undefined) throw new Error(`legal_assurance_undefined_value:${path}.${key}`);
      output[key] = canonicalizeValue(candidate, `${path}.${key}`);
    }
    return output;
  }

  throw new Error(`legal_assurance_non_json_value:${path}`);
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value, '$'));
}

export function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createPackageManifestDigest(manifest: LegalReviewPackageManifest): string {
  validatePackageManifest(manifest);
  return sha256Hex(canonicalizeJson(manifest));
}

export function validatePackageManifest(manifest: LegalReviewPackageManifest): void {
  if (!/^[0-9a-f]{40}$/.test(manifest.productReleaseSha)) {
    throw new Error('legal_assurance_invalid_release_sha');
  }
  if (!Number.isInteger(manifest.packageVersion) || manifest.packageVersion < 1) {
    throw new Error('legal_assurance_invalid_package_version');
  }
  if (!manifest.reviewId || !manifest.organizationId || !manifest.methodologyVersion || !manifest.regulatoryRulesVersion) {
    throw new Error('legal_assurance_manifest_identity_incomplete');
  }
  if (!Number.isFinite(Date.parse(manifest.createdAt))) {
    throw new Error('legal_assurance_invalid_created_at');
  }

  const seen = new Set<string>();
  for (const item of manifest.items) {
    if (!item.stableIdentifier || seen.has(item.stableIdentifier)) {
      throw new Error('legal_assurance_duplicate_or_empty_stable_identifier');
    }
    if (!/^[0-9a-f]{64}$/.test(item.contentDigest)) {
      throw new Error('legal_assurance_invalid_content_digest');
    }
    if (!item.sourceVersion || !Number.isFinite(Date.parse(item.capturedAt))) {
      throw new Error('legal_assurance_invalid_package_item_metadata');
    }
    seen.add(item.stableIdentifier);
  }
}

export function calculatePackageDelta(
  previous: readonly PackageItemFingerprint[],
  next: readonly PackageItemFingerprint[],
): PackageDelta[] {
  const before = new Map(previous.map((item) => [item.stableIdentifier, item.contentDigest]));
  const after = new Map(next.map((item) => [item.stableIdentifier, item.contentDigest]));
  const identifiers = Array.from(new Set([...before.keys(), ...after.keys()])).sort();

  return identifiers.map((stableIdentifier) => {
    const previousDigest = before.get(stableIdentifier) ?? null;
    const nextDigest = after.get(stableIdentifier) ?? null;

    if (previousDigest === null && nextDigest !== null) {
      return { stableIdentifier, contentDigest: nextDigest, previousDigest, kind: 'ADDED' };
    }
    if (previousDigest !== null && nextDigest === null) {
      return { stableIdentifier, contentDigest: previousDigest, previousDigest, kind: 'REMOVED' };
    }
    if (previousDigest === nextDigest) {
      return { stableIdentifier, contentDigest: nextDigest ?? '', previousDigest, kind: 'UNCHANGED' };
    }
    return { stableIdentifier, contentDigest: nextDigest ?? '', previousDigest, kind: 'CHANGED' };
  });
}

export function recommendReviewFromDelta(delta: readonly PackageDelta[]): ReviewRecommendation {
  const material = delta.filter((item) => item.kind !== 'UNCHANGED');
  if (material.length === 0) return 'NO_REVIEW';
  if (material.some((item) => item.kind === 'REMOVED') || material.length > 3) return 'FULL_REVIEW';
  return 'LIMITED_REVIEW';
}

export function isDecisionCurrent(input: {
  decision: CounselDecision;
  issuedAt: string;
  validUntil: string | null;
  now?: Date;
}): boolean {
  const issuedAt = Date.parse(input.issuedAt);
  if (!Number.isFinite(issuedAt)) return false;
  const now = input.now ?? new Date();
  if (issuedAt > now.getTime()) return false;
  if (input.validUntil === null) return true;
  const validUntil = Date.parse(input.validUntil);
  return Number.isFinite(validUntil) && validUntil > now.getTime();
}
