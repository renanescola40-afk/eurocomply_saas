import { AI_ACT_LEGAL_RULES_VERSION, type AiActLegalRole } from '@/server/ai-governance/legal-rules';

export const REGULATORY_CONTROL_TOWER_WORKSTREAMS = [
  'ai_literacy',
  'prohibited_practices',
  'high_risk_provider_data',
  'annex_iv',
  'qms',
  'fria',
  'article_50_transparency',
  'deployer_obligations',
  'post_market_monitoring',
  'conformity',
] as const;

export type RegulatoryControlTowerWorkstreamId = (typeof REGULATORY_CONTROL_TOWER_WORKSTREAMS)[number];
export type RegulatoryControlTowerStatus = 'not_started' | 'in_progress' | 'ready' | 'blocked' | 'not_applicable';
export type RegulatoryControlTowerOverallStatus = 'not_started' | 'in_progress' | 'ready' | 'blocked';
export type RegulatoryControlTowerStateSource = 'persisted_tenant_state' | 'repository_control';

export type RegulatoryWorkflowRecord = {
  id: string;
  lifecycleState: string;
  updatedAt: string | null;
};

export type RegulatoryControlTowerInput = Partial<Record<RegulatoryControlTowerWorkstreamId, RegulatoryWorkflowRecord | null>>;

export type RegulatoryControlTowerWorkstream = {
  id: RegulatoryControlTowerWorkstreamId;
  label: string;
  articleReference: string;
  legalRoles: AiActLegalRole[];
  weight: number;
  status: RegulatoryControlTowerStatus;
  lifecycleState: string | null;
  recordId: string | null;
  updatedAt: string | null;
  route: string | null;
  requiredAction: string | null;
  stateSource: RegulatoryControlTowerStateSource;
  humanReviewRequired: boolean;
  legalRulesVersion: string;
};

export type RegulatoryControlTowerDecision = {
  version: string;
  legalRulesVersion: string;
  overallStatus: RegulatoryControlTowerOverallStatus;
  activationPercent: number;
  readyPercent: number;
  activatedWeight: number;
  readyWeight: number;
  totalWeight: number;
  readyCount: number;
  blockedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  notApplicableCount: number;
  repositoryControlCount: number;
  workstreams: RegulatoryControlTowerWorkstream[];
  blockingWorkstreamIds: RegulatoryControlTowerWorkstreamId[];
  repositoryControlWorkstreamIds: RegulatoryControlTowerWorkstreamId[];
  requiredActions: string[];
  evidenceBoundary: string;
  humanReviewBoundary: string;
};

const VERSION = '2026-08-12.2';

type WorkstreamDefinition = {
  label: string;
  articleReference: string;
  legalRoles: AiActLegalRole[];
  weight: number;
  route: string | null;
  stateSource: RegulatoryControlTowerStateSource;
  humanReviewRequired: boolean;
};

const DEFINITIONS: Record<RegulatoryControlTowerWorkstreamId, WorkstreamDefinition> = {
  ai_literacy: {
    label: 'AI Literacy',
    articleReference: 'Article 4',
    legalRoles: ['provider', 'deployer'],
    weight: 6,
    route: '/dashboard/ai-literacy',
    stateSource: 'persisted_tenant_state',
    humanReviewRequired: true,
  },
  prohibited_practices: {
    label: 'Prohibited Practices',
    articleReference: 'Article 5',
    legalRoles: ['provider', 'deployer', 'importer', 'distributor', 'product_manufacturer'],
    weight: 7,
    route: '/dashboard/prohibited-practices',
    stateSource: 'persisted_tenant_state',
    humanReviewRequired: true,
  },
  high_risk_provider_data: {
    label: 'High-Risk Provider Data Governance',
    articleReference: 'Articles 9–10',
    legalRoles: ['provider', 'product_manufacturer'],
    weight: 9,
    route: '/dashboard/provider-data',
    stateSource: 'persisted_tenant_state',
    humanReviewRequired: true,
  },
  annex_iv: {
    label: 'Annex IV Technical Documentation',
    articleReference: 'Article 11 and Annex IV',
    legalRoles: ['provider', 'product_manufacturer'],
    weight: 6,
    route: '/dashboard/annex-iv',
    stateSource: 'persisted_tenant_state',
    humanReviewRequired: true,
  },
  qms: {
    label: 'Quality Management System',
    articleReference: 'Article 17',
    legalRoles: ['provider', 'product_manufacturer'],
    weight: 5,
    route: '/dashboard/qms',
    stateSource: 'persisted_tenant_state',
    humanReviewRequired: true,
  },
  fria: {
    label: 'Fundamental Rights Impact Assessment',
    articleReference: 'Article 27',
    legalRoles: ['deployer', 'public_authority', 'private_public_service_provider'],
    weight: 6,
    route: '/dashboard/fria',
    stateSource: 'persisted_tenant_state',
    humanReviewRequired: true,
  },
  article_50_transparency: {
    label: 'Transparency and Synthetic Content',
    articleReference: 'Article 50',
    legalRoles: ['provider', 'deployer'],
    weight: 8,
    route: '/dashboard/transparencia',
    stateSource: 'persisted_tenant_state',
    humanReviewRequired: true,
  },
  deployer_obligations: {
    label: 'Deployer Obligations',
    articleReference: 'Article 26',
    legalRoles: ['deployer'],
    weight: 7,
    route: '/dashboard/compliance',
    stateSource: 'repository_control',
    humanReviewRequired: true,
  },
  post_market_monitoring: {
    label: 'Post-Market Monitoring and Incident Governance',
    articleReference: 'Articles 72–73 and incident-supporting controls',
    legalRoles: ['provider', 'deployer'],
    weight: 6,
    route: '/dashboard/compliance',
    stateSource: 'repository_control',
    humanReviewRequired: true,
  },
  conformity: {
    label: 'Conformity, Declaration, CE and Registration',
    articleReference: 'Articles 43–49',
    legalRoles: ['provider', 'authorised_representative', 'importer', 'product_manufacturer'],
    weight: 5,
    route: null,
    stateSource: 'persisted_tenant_state',
    humanReviewRequired: true,
  },
};

const READY_STATES = new Set(['active', 'approved', 'ready', 'complete', 'completed']);
const BLOCKED_STATES = new Set(['blocked', 'rejected', 'failed']);
const NOT_APPLICABLE_STATES = new Set(['not_applicable', 'not_required']);
const RETIRED_STATES = new Set(['retired', 'archived']);

function normaliseState(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function classify(record: RegulatoryWorkflowRecord | null | undefined): RegulatoryControlTowerStatus {
  if (!record) return 'not_started';
  const state = normaliseState(record.lifecycleState);
  if (BLOCKED_STATES.has(state)) return 'blocked';
  if (NOT_APPLICABLE_STATES.has(state)) return 'not_applicable';
  if (READY_STATES.has(state)) return 'ready';
  if (!state || RETIRED_STATES.has(state)) return 'not_started';
  return 'in_progress';
}

function actionFor(status: RegulatoryControlTowerStatus, definition: WorkstreamDefinition) {
  if (definition.stateSource === 'repository_control' && status === 'not_started') {
    return `Capture organization-specific runtime evidence for ${definition.label}; repository implementation and CI coverage alone are not a tenant readiness pass.`;
  }
  if (status === 'not_started') return `Create and scope the ${definition.label} workflow.`;
  if (status === 'blocked') return `Resolve the blocking findings in ${definition.label} before release readiness.`;
  if (status === 'in_progress') return `Complete evidence, review and approval for ${definition.label}.`;
  return null;
}

export function buildRegulatoryControlTower(input: RegulatoryControlTowerInput): RegulatoryControlTowerDecision {
  const workstreams = REGULATORY_CONTROL_TOWER_WORKSTREAMS.map((id): RegulatoryControlTowerWorkstream => {
    const definition = DEFINITIONS[id];
    const record = input[id] ?? null;
    const status = classify(record);

    return {
      id,
      label: definition.label,
      articleReference: definition.articleReference,
      legalRoles: definition.legalRoles,
      weight: definition.weight,
      status,
      lifecycleState: record?.lifecycleState ?? null,
      recordId: record?.id ?? null,
      updatedAt: record?.updatedAt ?? null,
      route: definition.route,
      requiredAction: actionFor(status, definition),
      stateSource: definition.stateSource,
      humanReviewRequired: definition.humanReviewRequired,
      legalRulesVersion: AI_ACT_LEGAL_RULES_VERSION,
    };
  });

  const totalWeight = workstreams.reduce((total, item) => total + item.weight, 0);
  const activatedWeight = workstreams.filter((item) => item.status !== 'not_started').reduce((total, item) => total + item.weight, 0);
  const readyWeight = workstreams.filter((item) => item.status === 'ready' || item.status === 'not_applicable').reduce((total, item) => total + item.weight, 0);
  const blocked = workstreams.filter((item) => item.status === 'blocked');
  const inProgress = workstreams.filter((item) => item.status === 'in_progress');
  const notStarted = workstreams.filter((item) => item.status === 'not_started');
  const ready = workstreams.filter((item) => item.status === 'ready');
  const notApplicable = workstreams.filter((item) => item.status === 'not_applicable');
  const repositoryControls = workstreams.filter((item) => item.stateSource === 'repository_control');

  let overallStatus: RegulatoryControlTowerOverallStatus = 'not_started';
  if (blocked.length > 0) overallStatus = 'blocked';
  else if (readyWeight === totalWeight) overallStatus = 'ready';
  else if (activatedWeight > 0) overallStatus = 'in_progress';

  return {
    version: VERSION,
    legalRulesVersion: AI_ACT_LEGAL_RULES_VERSION,
    overallStatus,
    activationPercent: Math.round((activatedWeight / totalWeight) * 100),
    readyPercent: Math.round((readyWeight / totalWeight) * 100),
    activatedWeight,
    readyWeight,
    totalWeight,
    readyCount: ready.length,
    blockedCount: blocked.length,
    inProgressCount: inProgress.length,
    notStartedCount: notStarted.length,
    notApplicableCount: notApplicable.length,
    repositoryControlCount: repositoryControls.length,
    workstreams,
    blockingWorkstreamIds: blocked.map((item) => item.id),
    repositoryControlWorkstreamIds: repositoryControls.map((item) => item.id),
    requiredActions: workstreams.map((item) => item.requiredAction).filter((action): action is string => Boolean(action)),
    evidenceBoundary: 'This control tower aggregates persisted workflow lifecycle states and repository controls for operational visibility. It does not validate underlying evidence, certify compliance, authorize market placement or replace legal, technical or conformity assessment review.',
    humanReviewBoundary: 'HUMAN_REVIEW_REQUIRED for customer-specific facts, legal interpretation, high-risk determination, fundamental-rights analysis, exceptions, proportionality, adequacy and technical performance in real deployment.',
  };
}
