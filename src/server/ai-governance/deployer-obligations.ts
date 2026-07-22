export type ObligationStatus = 'not_started' | 'in_progress' | 'blocked' | 'ready' | 'not_applicable';

export interface DeployerObligationInput {
  id: string;
  applicable: boolean | null;
  ownerId?: string | null;
  dueAt?: string | null;
  evidenceIds: string[];
  approvedBy?: string | null;
  approvalAt?: string | null;
  exceptionRationale?: string | null;
  openCriticalFindings: number;
  stale: boolean;
}

export interface DeployerDecision {
  status: ObligationStatus;
  blockers: string[];
  canApprove: boolean;
}

export const DEPLOYER_OBLIGATION_IDS = [
  'instructions-of-use', 'human-oversight', 'operator-competence', 'input-data-quality',
  'monitoring', 'logging', 'provider-cooperation', 'suspension', 'incident-reporting',
  'worker-information', 'affected-person-information', 'decision-explanation',
  'dpia', 'fria', 'eu-database-registration', 'authority-cooperation',
] as const;

export function decideDeployerObligation(input: DeployerObligationInput): DeployerDecision {
  const blockers: string[] = [];
  if (input.applicable === null) blockers.push('applicability_unresolved');
  if (input.applicable === false && !input.exceptionRationale?.trim()) blockers.push('not_applicable_rationale_missing');
  if (input.applicable === true) {
    if (!input.ownerId) blockers.push('owner_missing');
    if (!input.dueAt) blockers.push('deadline_missing');
    if (input.evidenceIds.length === 0) blockers.push('evidence_missing');
    if (input.openCriticalFindings > 0) blockers.push('critical_findings_open');
    if (input.stale) blockers.push('review_stale');
    if (!input.approvedBy || !input.approvalAt) blockers.push('approval_missing');
  }
  if (blockers.length > 0) return { status: input.applicable === null ? 'blocked' : 'in_progress', blockers, canApprove: false };
  return { status: input.applicable === false ? 'not_applicable' : 'ready', blockers: [], canApprove: true };
}

export function summarizeDeployerWorkspace(items: DeployerObligationInput[]) {
  const decisions = items.map((item) => ({ id: item.id, ...decideDeployerObligation(item) }));
  return {
    total: decisions.length,
    ready: decisions.filter((item) => item.status === 'ready').length,
    blocked: decisions.filter((item) => item.status === 'blocked' || item.blockers.length > 0).length,
    releaseBlocked: decisions.some((item) => item.status === 'blocked' || item.blockers.includes('critical_findings_open')),
    decisions,
  };
}
