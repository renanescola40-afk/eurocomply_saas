export type ArchitectureDecisionFormat = 'numbered' | 'dated-adr' | 'dated-decision';

export interface ArchitectureDecisionRecord {
  path: string;
  identity: string;
  format: string;
  number: string | null;
  status: string | null;
  date: string | null;
  digest: string;
  requiredSectionsPresent: boolean;
}

export interface ArchitectureDecisionScan {
  passed: boolean;
  failures: string[];
  decisions: ArchitectureDecisionRecord[];
  aggregateDigest: string | null;
}

export interface ArchitectureReviewEvidenceOptions {
  scan?: ArchitectureDecisionScan | null;
  generatedAt?: string;
  repository?: string;
  branch?: string;
  targetSha?: string;
  observedSha?: string;
  runId?: string;
  githubActions?: boolean;
  evidencePath?: string;
}

export function scanArchitectureDecisions(options?: {
  decisionsDir?: string;
  minimumDecisions?: number;
}): ArchitectureDecisionScan;

export function buildArchitectureReviewEvidence(options?: ArchitectureReviewEvidenceOptions): {
  schema: string;
  evidenceItem: string;
  status: 'Complete' | 'Open';
  outcome: 'passed' | 'not_verified';
  generatedAt: string;
  reviewedAt: string;
  reviewer: string;
  repository: string;
  branch: string;
  targetSha: string;
  observedSha: string;
  githubRunId: string;
  summary: string;
  checks: Array<{ name: string; passed: boolean }>;
  decisionInventory: {
    count: number;
    statusCounts: Record<string, number>;
    formatCounts: Record<string, number>;
    aggregateDigest: string | null;
    paths: string[];
  };
  controlsVerified: string[];
  failures: string[];
  evidenceLocations: string[];
  redactionConfirmation: string;
  evidenceIntegrity: {
    containsSensitiveValues: false;
    rawDecisionContentStored: false;
    exactShaBound: boolean;
    generatedByProtectedAutomation: boolean;
  };
};
