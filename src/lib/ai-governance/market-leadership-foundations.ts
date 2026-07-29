export const GOVERNANCE_ENTITY_TYPES = [
  'system',
  'model',
  'agent',
  'dataset',
  'vendor',
  'use_case',
] as const;

export type GovernanceEntityType = (typeof GOVERNANCE_ENTITY_TYPES)[number];

export const VALUE_EVENT_NAMES = [
  'workspace_created',
  'first_inventory_created',
  'first_classification_completed',
  'first_control_activated',
  'first_evidence_accepted',
  'first_report_exported',
  'first_vendor_reviewed',
  'first_regulatory_impact_resolved',
] as const;

export type ValueEventName = (typeof VALUE_EVENT_NAMES)[number];

export type FrameworkMapping = {
  frameworkKey: string;
  frameworkVersion: string;
  requirementKey: string;
  mappingStrength: 'partial' | 'substantial' | 'full';
  rationale: string;
};

export type EvidenceCandidate = {
  environment: 'local' | 'ci' | 'staging' | 'production' | 'external';
  evidenceClass: 'synthetic' | 'customer' | 'provider' | 'qualified_review';
  integrityDigest: string;
  sourceReference: string;
  collectedAt: Date;
  validFrom: Date;
  validUntil?: Date | null;
  limitations: string;
  reviewStatus: 'unreviewed' | 'review_required' | 'accepted' | 'rejected' | 'expired';
};

export type EvidenceDecision = {
  reusable: boolean;
  current: boolean;
  productionProof: boolean;
  accepted: boolean;
  reasons: string[];
};

const SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/;

export function evaluateEvidence(
  evidence: EvidenceCandidate,
  now: Date = new Date(),
): EvidenceDecision {
  const reasons: string[] = [];
  const nowMs = now.getTime();
  const current =
    evidence.validFrom.getTime() <= nowMs &&
    evidence.collectedAt.getTime() <= nowMs &&
    (!evidence.validUntil || evidence.validUntil.getTime() > nowMs);

  if (!SHA256_DIGEST.test(evidence.integrityDigest)) {
    reasons.push('invalid_integrity_digest');
  }

  if (!evidence.sourceReference.trim()) {
    reasons.push('missing_source_reference');
  }

  if (!evidence.limitations.trim()) {
    reasons.push('missing_limitations');
  }

  if (evidence.collectedAt.getTime() < evidence.validFrom.getTime()) {
    reasons.push('collected_before_validity_window');
  }

  if (evidence.validFrom.getTime() > nowMs) {
    reasons.push('not_yet_valid');
  }

  if (evidence.collectedAt.getTime() > nowMs) {
    reasons.push('collected_in_future');
  }

  if (
    (evidence.validUntil && evidence.validUntil.getTime() <= nowMs) ||
    evidence.reviewStatus === 'expired'
  ) {
    reasons.push('expired');
  }

  if (evidence.evidenceClass === 'synthetic' && evidence.environment === 'production') {
    reasons.push('synthetic_cannot_be_production_proof');
  }

  const accepted = evidence.reviewStatus === 'accepted' && reasons.length === 0;
  const productionProof =
    accepted &&
    current &&
    evidence.environment === 'production' &&
    evidence.evidenceClass !== 'synthetic';

  return {
    reusable: accepted && current,
    current,
    productionProof,
    accepted,
    reasons,
  };
}

export type RegulatoryChange = {
  bindingStatus: 'binding' | 'guidance' | 'code' | 'standard' | 'draft' | 'unknown';
  effectiveAt?: Date | null;
  sourceVerifiedAt?: Date | null;
  affectedEntityIds: string[];
  affectedControlIds: string[];
};

export type RegulatoryImpactDecision = {
  status: 'triaged' | 'action_required' | 'review_required';
  requiresHumanReview: boolean;
  reasons: string[];
};

export function classifyRegulatoryImpact(
  change: RegulatoryChange,
  now: Date = new Date(),
): RegulatoryImpactDecision {
  const reasons: string[] = [];

  if (change.bindingStatus === 'draft' || change.bindingStatus === 'unknown') {
    reasons.push('non_binding_or_unknown_source');
  }

  if (!change.sourceVerifiedAt) {
    reasons.push('source_not_verified');
  }

  if (change.affectedEntityIds.length === 0 && change.affectedControlIds.length === 0) {
    reasons.push('impact_scope_not_resolved');
  }

  if (change.effectiveAt && change.effectiveAt.getTime() <= now.getTime()) {
    reasons.push('effective_now_or_overdue');
  }

  const requiresHumanReview = reasons.some((reason) =>
    ['non_binding_or_unknown_source', 'source_not_verified', 'impact_scope_not_resolved'].includes(reason),
  );

  if (requiresHumanReview) {
    return { status: 'review_required', requiresHumanReview, reasons };
  }

  if (change.affectedEntityIds.length > 0 || change.affectedControlIds.length > 0) {
    return { status: 'action_required', requiresHumanReview, reasons };
  }

  return { status: 'triaged', requiresHumanReview, reasons };
}

export type TimeToValueMilestone = {
  eventName: ValueEventName;
  occurredAt: Date;
};

export type TimeToValueSummary = {
  firstInventoryMinutes: number | null;
  firstClassificationMinutes: number | null;
  firstEvidenceMinutes: number | null;
  firstReportMinutes: number | null;
  activated: boolean;
};

export function calculateTimeToValue(
  workspaceCreatedAt: Date,
  milestones: TimeToValueMilestone[],
): TimeToValueSummary {
  const first = (eventName: ValueEventName): Date | null => {
    const matches = milestones
      .filter((milestone) => milestone.eventName === eventName)
      .map((milestone) => milestone.occurredAt.getTime())
      .sort((a, b) => a - b);

    return matches.length > 0 ? new Date(matches[0]) : null;
  };

  const minutesFromStart = (date: Date | null): number | null =>
    date ? Math.max(0, Math.round((date.getTime() - workspaceCreatedAt.getTime()) / 60_000)) : null;

  const firstInventoryMinutes = minutesFromStart(first('first_inventory_created'));
  const firstClassificationMinutes = minutesFromStart(first('first_classification_completed'));
  const firstEvidenceMinutes = minutesFromStart(first('first_evidence_accepted'));
  const firstReportMinutes = minutesFromStart(first('first_report_exported'));

  return {
    firstInventoryMinutes,
    firstClassificationMinutes,
    firstEvidenceMinutes,
    firstReportMinutes,
    activated: firstInventoryMinutes !== null && firstClassificationMinutes !== null,
  };
}

export function deduplicateFrameworkMappings(
  mappings: FrameworkMapping[],
): FrameworkMapping[] {
  const unique = new Map<string, FrameworkMapping>();

  for (const mapping of mappings) {
    const key = [
      mapping.frameworkKey.trim().toLowerCase(),
      mapping.frameworkVersion.trim().toLowerCase(),
      mapping.requirementKey.trim().toLowerCase(),
    ].join(':');

    if (!unique.has(key)) {
      unique.set(key, mapping);
    }
  }

  return [...unique.values()];
}
