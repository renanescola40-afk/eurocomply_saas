export const AI_LITERACY_ASSIGNMENT_STATUSES = [
  'assigned',
  'in_progress',
  'completed',
  'expired',
  'waived',
  'revoked',
] as const;

export type AiLiteracyAssignmentStatus = (typeof AI_LITERACY_ASSIGNMENT_STATUSES)[number];
export type AiLiteracyEvidenceStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'superseded';

export type AiLiteracyEvidenceSnapshot = {
  status: AiLiteracyEvidenceStatus;
  validUntil?: string | null;
};

export type AiLiteracyAssignmentSnapshot = {
  id: string;
  status: AiLiteracyAssignmentStatus;
  dueAt?: string | null;
  completedAt?: string | null;
  validUntil?: string | null;
  score?: number | null;
  passingScore?: number | null;
  acknowledgement: boolean;
  waiverRationale?: string | null;
  waiverApprovedBy?: string | null;
  waiverApprovedAt?: string | null;
  evidence: AiLiteracyEvidenceSnapshot[];
};

export type AiLiteracyAssignmentEvaluation = {
  assignmentId: string;
  outcome: 'ready' | 'partial' | 'missing' | 'expired' | 'overdue' | 'waived' | 'revoked';
  score: number | null;
  reasons: string[];
};

export type AiLiteracyCoverage = {
  score: number | null;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'ready';
  totals: {
    assignments: number;
    ready: number;
    partial: number;
    missing: number;
    expired: number;
    overdue: number;
    waived: number;
    revoked: number;
  };
  evaluations: AiLiteracyAssignmentEvaluation[];
};

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isExpired(value: string | null | undefined, asOf: number) {
  const timestamp = parseTimestamp(value);
  return timestamp !== null && timestamp < asOf;
}

function hasValidApprovedEvidence(evidence: AiLiteracyEvidenceSnapshot[], asOf: number) {
  return evidence.some((item) => item.status === 'approved' && !isExpired(item.validUntil, asOf));
}

function hasPendingEvidence(evidence: AiLiteracyEvidenceSnapshot[]) {
  return evidence.some((item) => item.status === 'submitted' || item.status === 'under_review');
}

function hasValidWaiver(assignment: AiLiteracyAssignmentSnapshot) {
  return Boolean(
    assignment.waiverRationale?.trim()
      && assignment.waiverApprovedBy?.trim()
      && parseTimestamp(assignment.waiverApprovedAt) !== null,
  );
}

export function evaluateAiLiteracyAssignment(
  assignment: AiLiteracyAssignmentSnapshot,
  asOf = new Date().toISOString(),
): AiLiteracyAssignmentEvaluation {
  const asOfTimestamp = parseTimestamp(asOf);
  if (asOfTimestamp === null) throw new Error('ai_literacy_assessment_date_invalid');

  if (assignment.status === 'revoked') {
    return { assignmentId: assignment.id, outcome: 'revoked', score: null, reasons: ['assignment_revoked'] };
  }

  if (assignment.status === 'waived') {
    if (hasValidWaiver(assignment)) {
      return { assignmentId: assignment.id, outcome: 'waived', score: 100, reasons: ['approved_waiver'] };
    }

    return {
      assignmentId: assignment.id,
      outcome: 'missing',
      score: 0,
      reasons: ['waiver_not_approved'],
    };
  }

  if (assignment.status === 'expired' || isExpired(assignment.validUntil, asOfTimestamp)) {
    return { assignmentId: assignment.id, outcome: 'expired', score: 0, reasons: ['training_validity_expired'] };
  }

  const dueAt = parseTimestamp(assignment.dueAt);
  if (assignment.status !== 'completed' && dueAt !== null && dueAt < asOfTimestamp) {
    return { assignmentId: assignment.id, outcome: 'overdue', score: 0, reasons: ['assignment_overdue'] };
  }

  if (assignment.status !== 'completed') {
    return {
      assignmentId: assignment.id,
      outcome: assignment.status === 'in_progress' ? 'partial' : 'missing',
      score: assignment.status === 'in_progress' ? 25 : 0,
      reasons: [assignment.status === 'in_progress' ? 'training_in_progress' : 'training_not_completed'],
    };
  }

  const reasons: string[] = [];
  if (parseTimestamp(assignment.completedAt) === null) reasons.push('completion_timestamp_missing');
  if (!assignment.acknowledgement) reasons.push('acknowledgement_missing');

  const passingScore = assignment.passingScore;
  if (passingScore !== null && passingScore !== undefined) {
    if (assignment.score === null || assignment.score === undefined) reasons.push('assessment_score_missing');
    else if (assignment.score < passingScore) reasons.push('assessment_score_below_threshold');
  }

  if (!hasValidApprovedEvidence(assignment.evidence, asOfTimestamp)) {
    reasons.push(hasPendingEvidence(assignment.evidence) ? 'evidence_pending_review' : 'approved_evidence_missing');
  }

  if (reasons.length === 0) {
    return { assignmentId: assignment.id, outcome: 'ready', score: 100, reasons: ['completion_verified'] };
  }

  const hardFailure = reasons.some((reason) =>
    ['completion_timestamp_missing', 'acknowledgement_missing', 'assessment_score_below_threshold'].includes(reason),
  );

  return {
    assignmentId: assignment.id,
    outcome: 'partial',
    score: hardFailure ? 25 : 50,
    reasons,
  };
}

export function calculateAiLiteracyCoverage(
  assignments: AiLiteracyAssignmentSnapshot[],
  asOf = new Date().toISOString(),
): AiLiteracyCoverage {
  const evaluations = assignments.map((assignment) => evaluateAiLiteracyAssignment(assignment, asOf));
  const scored = evaluations.filter((evaluation) => evaluation.score !== null);

  const totals = {
    assignments: scored.length,
    ready: evaluations.filter((evaluation) => evaluation.outcome === 'ready').length,
    partial: evaluations.filter((evaluation) => evaluation.outcome === 'partial').length,
    missing: evaluations.filter((evaluation) => evaluation.outcome === 'missing').length,
    expired: evaluations.filter((evaluation) => evaluation.outcome === 'expired').length,
    overdue: evaluations.filter((evaluation) => evaluation.outcome === 'overdue').length,
    waived: evaluations.filter((evaluation) => evaluation.outcome === 'waived').length,
    revoked: evaluations.filter((evaluation) => evaluation.outcome === 'revoked').length,
  };

  if (scored.length === 0) {
    return { score: null, status: 'not_started', totals, evaluations };
  }

  const score = Math.round(scored.reduce((sum, evaluation) => sum + (evaluation.score ?? 0), 0) / scored.length);
  const blocking = totals.missing + totals.expired + totals.overdue;

  return {
    score,
    status: score === 100 && blocking === 0 && totals.partial === 0 ? 'ready' : blocking > 0 ? 'at_risk' : 'in_progress',
    totals,
    evaluations,
  };
}
